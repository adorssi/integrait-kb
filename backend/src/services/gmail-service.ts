import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { BackupResult } from '@prisma/client';

export interface VeeamJobDetail {
  startTime: string | null;
  endTime: string | null;
  dataSize: string | null;
  dataRead: string | null;
  dataTransferred: string | null;
  duration: string | null;
  failureReason: string | null;
}

export interface ParsedEmail {
  clientName: string;
  result: BackupResult;
  taskName: string;
  occurredAt: Date;
  rawSubject: string;
  messageUid: string;
  detail: VeeamJobDetail | null;
}

/**
 * Parsea el asunto de un email de Veeam.
 * Formatos soportados:
 *   "CLIENTE - [Result] NombreTarea"          (formato estándar)
 *   "CLIENTE -NombreTarea[Result]"             (sin espacio post-guion, bracket pegado)
 *   "SUPPORT EXPIRED CLIENTE - [Result] ..."   (contrato expirado)
 */
export function parseVeeamSubject(subject: string): Omit<ParsedEmail, 'occurredAt' | 'messageUid' | 'detail'> | null {
  const cleaned = subject.trim().replace(/^SUPPORT EXPIRED\s+/i, '');

  // Encuentra el primer guion precedido de espacio: " - " o " -X"
  const dashIdx = cleaned.search(/\s-/);
  if (dashIdx === -1) return null;

  const clientName = cleaned.slice(0, dashIdx).trim();

  // El resto: todo lo que viene después del guion (con o sin espacio)
  const afterDash = cleaned.slice(dashIdx + 1).replace(/^-?\s*/, '').trim();

  // El bracket [Result] puede estar en cualquier posición del resto
  const bracketMatch = afterDash.match(/\[(Success|Warning|Failed|Failure)\]/i);
  if (!bracketMatch) return null;

  const resultStr = bracketMatch[1].toLowerCase();

  // El nombre de tarea es el resto sin el bracket y sin espacios extra
  const taskName = afterDash
    .replace(/\s*\[(?:Success|Warning|Failed|Failure)\]\s*/i, ' ')
    .trim();

  let result: BackupResult;
  if (resultStr === 'success') result = BackupResult.SUCCESS;
  else if (resultStr === 'warning') result = BackupResult.WARNING;
  else result = BackupResult.FAILURE;

  return { clientName, result, taskName: taskName || afterDash, rawSubject: subject };
}

/**
 * Extrae texto plano de una celda HTML (quita tags, decodifica entidades básicas).
 */
function cellText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#160;/g, ' ')
    .trim();
}

/**
 * Extrae todas las celdas del HTML como pares planos [label, value, label, value, ...]
 * y busca los campos de Veeam por nombre de etiqueta.
 *
 * Soporta dos formatos de email de Veeam:
 *   A) Tabla clásica: cabecera en la primera fila, valores en la segunda
 *      Name | Status | Start time | End time | Size | Read | Transferred | Duration
 *   B) Layout horizontal label/valor por pares en la misma fila
 *      "Start time" | "19:30:13" | "Total size" | "1,5 TB" | ...
 */
export function parseVeeamDetails(html: string): VeeamJobDetail | null {
  if (!html) return null;

  // Extraer todas las celdas del HTML completo (no solo la sección Details)
  const allCells = [...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    .map((c) => cellText(c[1]))
    .filter((c) => c.length > 0);

  if (allCells.length === 0) return null;

  // Mapa de etiquetas conocidas de Veeam → campo destino
  const labelMap: Record<string, keyof VeeamJobDetail> = {
    'start time':   'startTime',
    'end time':     'endTime',
    'total size':   'dataSize',
    'size':         'dataSize',
    'read':         'dataRead',
    'backup size':  'dataTransferred',
    'transferred':  'dataTransferred',
    'duration':     'duration',
  };

  const result: VeeamJobDetail = {
    startTime: null, endTime: null, dataSize: null,
    dataRead: null, dataTransferred: null, duration: null, failureReason: null,
  };

  // Estrategia 1: buscar etiquetas conocidas y tomar el valor en la celda siguiente
  for (let i = 0; i < allCells.length - 1; i++) {
    const key = labelMap[allCells[i].toLowerCase()];
    if (key && result[key] === null) {
      const val = allCells[i + 1];
      // El valor no debe ser otra etiqueta conocida ni estar vacío
      if (val && !labelMap[val.toLowerCase()]) {
        result[key] = val;
      }
    }
  }

  // Estrategia 2 (formato tabla clásica): buscar fila con ≥7 celdas que NO sean etiquetas
  if (!result.startTime && !result.duration) {
    const rowPattern = /<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi;
    const rows: string[][] = [];
    let m: RegExpExecArray | null;
    while ((m = rowPattern.exec(html)) !== null) {
      const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((c) => cellText(c[1]));
      if (cells.length >= 7) rows.push(cells);
      if (rows.length >= 20) break;
    }
    const headerKw = /^(name|status|start time|end time|size|read|transferred|duration|total size|backup size)$/i;
    const dataRow = rows.find((r) => !headerKw.test(r[0]) && r[0].length > 0);
    if (dataRow) {
      result.startTime       ??= dataRow[2] ?? null;
      result.endTime         ??= dataRow[3] ?? null;
      result.dataSize        ??= dataRow[4] ?? null;
      result.dataRead        ??= dataRow[5] ?? null;
      result.dataTransferred ??= dataRow[6] ?? null;
      result.duration        ??= dataRow[7] ?? null;
    }
  }

  // Parsear motivo de fallo (aparece como celda "Reason" o párrafo suelto en el cuerpo)
  result.failureReason = parseFailureReason(html, allCells);

  const hasAny = Object.values(result).some((v) => v !== null);
  return hasAny ? result : null;
}

/**
 * Extrae el motivo de fallo de un email de Veeam.
 * Estrategia 1: buscar etiqueta "Reason" (celda o encabezado) y tomar el texto siguiente.
 * Estrategia 2: buscar bloques de texto (<p>, <div>, <td>) que contengan mensajes de error típicos.
 * Estrategia 3: buscar párrafos de texto libre fuera de tablas al final del email.
 */
function parseFailureReason(html: string, allCells: string[]): string | null {
  // Estrategia 1: celda etiquetada "Reason" o "Error" → siguiente celda
  const reasonIdx = allCells.findIndex((c) => /^reason[s]?$/i.test(c) || /^error[s]?$/i.test(c));
  if (reasonIdx !== -1 && reasonIdx < allCells.length - 1) {
    const val = allCells[reasonIdx + 1];
    // Valor válido: no es otra etiqueta común, tiene cierta longitud
    if (val && val.length > 3 && !/^(name|status|start|end|size|read|transferred|duration|success|warning|failed|failure)$/i.test(val)) {
      return val;
    }
  }

  // Estrategia 2: buscar bloques <p> o <div> con texto de error fuera de tablas
  // Elimina todo el contenido de las tablas primero
  const noTables = html.replace(/<table[\s\S]*?<\/table>/gi, '');
  const blocks = [...noTables.matchAll(/<(?:p|div|span|li)[^>]*>([\s\S]*?)<\/(?:p|div|span|li)>/gi)]
    .map((m) => cellText(m[1]))
    .filter((t) => t.length > 10 && t.length < 2000);

  // Buscar texto que parezca un error: contiene palabras clave típicas de fallo de Veeam
  const errorPattern = /\b(failed|error|timeout|timed out|cannot|unable|repository|access denied|permission|disk|space|connection|certificate|agent)\b/i;
  const candidate = blocks.find((b) => errorPattern.test(b) && b.length > 15);
  if (candidate) return candidate;

  return null;
}

export async function fetchBackupEmails(since?: Date): Promise<ParsedEmail[]> {
  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_APP_PASSWORD;

  if (!email || !password) {
    throw new Error('GMAIL_EMAIL y GMAIL_APP_PASSWORD no están configurados en .env');
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: password },
    logger: false,
  });

  const results: ParsedEmail[] = [];
  const sinceDate = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const uids = await client.search({ since: sinceDate }, { uid: true });

      if (uids && uids.length > 0) {
        // Descargamos el source completo para poder parsear el cuerpo HTML
        for await (const msg of client.fetch(uids as number[], { envelope: true, source: true }, { uid: true })) {
          const subject = msg.envelope?.subject ?? '';
          const parsed = parseVeeamSubject(subject);
          if (!parsed) continue;

          // Parsear el cuerpo para extraer los Details de Veeam
          let detail: VeeamJobDetail | null = null;
          if (msg.source) {
            try {
              const mail = await simpleParser(msg.source);
              const html = (mail.html || mail.textAsHtml || '').toString();
              detail = parseVeeamDetails(html);
            } catch {
              // Si falla el parseo del cuerpo, dejamos detail en null
            }
          }

          results.push({
            ...parsed,
            occurredAt: msg.envelope?.date ?? new Date(),
            messageUid: String(msg.uid),
            detail,
          });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return results;
}
