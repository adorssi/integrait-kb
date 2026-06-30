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
  jobMessage: string | null;
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
    dataRead: null, dataTransferred: null, duration: null, jobMessage: null,
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

  // Parsear mensaje del cuerpo del email (presente en SUCCESS, WARNING y FAILURE)
  result.jobMessage = parseJobMessage(html, allCells);

  // DEBUG TEMPORAL — eliminar una vez confirmado el parser
  if (!result.jobMessage) {
    console.log('[DEBUG parseVeeamDetails] jobMessage=null — allCells:', JSON.stringify(allCells.slice(0, 30)));
  }

  const hasAny = Object.values(result).some((v) => v !== null);
  return hasAny ? result : null;
}

/**
 * Extrae el mensaje significativo del cuerpo de un email de Veeam.
 * Aplica para SUCCESS, WARNING y FAILURE.
 *
 * Los emails de Veeam son casi 100% tablas HTML, por lo que buscar "fuera de tablas"
 * no funciona. En su lugar se analiza el contenido de las propias celdas.
 *
 * Estrategia 1: celda con prefijo "Reason:" / "Error:" incrustado → extrae el valor.
 * Estrategia 2: celda etiquetada "Reason"/"Error" → toma la celda siguiente.
 * Estrategia 3: celda con keywords de error de Veeam y longitud > 30 chars.
 * Estrategia 4: celda larga (>50 chars) con múltiples palabras que no sea un nombre de tarea.
 * Estrategia 5: párrafos fuera de tablas como fallback final.
 */
function parseJobMessage(html: string, allCells: string[]): string | null {
  const knownLabel = /^(name|status|start time|end time|total size|size|read|backup size|transferred|duration|success|warning|failed|failure|job name|result)$/i;
  // Valores cortos de Details: tiempos, tamaños, duraciones
  const isDetailValue = /^\d{1,2}:\d{2}(:\d{2})?$|^\d+[.,]\d+\s*(GB|TB|MB|KB)|^\d+\s*min|^[\d.,]+\s*(B|KB|MB|GB|TB)$/i;

  // Estrategia 1: celda que empieza con "Reason:" o "Error:" como prefijo inline
  for (const cell of allCells) {
    const m = cell.match(/^(?:reason|error)[s]?\s*:\s*(.+)/is);
    if (m && m[1].trim().length > 5) return m[1].trim();
  }

  // Estrategia 2: celda etiquetada "Reason"/"Error" → siguiente celda
  const reasonIdx = allCells.findIndex((c) => /^reason[s]?$/i.test(c) || /^error[s]?$/i.test(c));
  if (reasonIdx !== -1 && reasonIdx < allCells.length - 1) {
    const val = allCells[reasonIdx + 1];
    if (val && val.length > 5 && !knownLabel.test(val) && !isDetailValue.test(val)) {
      return val;
    }
  }

  // Estrategia 3: cualquier celda con keywords típicas de error/warning de Veeam
  const keywordPattern = /\b(failed|timed out|timeout|cannot|unable|repository|access denied|permission denied|disk full|no space|connection refused|certificate|agent|threshold|post-job script|pre-job script)\b/i;
  for (const cell of allCells) {
    if (cell.length > 20 && keywordPattern.test(cell) && !knownLabel.test(cell) && !isDetailValue.test(cell)) {
      return cell;
    }
  }

  // Estrategia 4: celda larga con varias palabras que parece una descripción
  // (excluye valores cortos de Details y etiquetas)
  const taskNamePattern = /\(\d+ object/i; // típico de nombres de tarea de Veeam
  for (const cell of allCells) {
    if (
      cell.length > 50 &&
      cell.split(' ').length > 5 &&
      !knownLabel.test(cell) &&
      !isDetailValue.test(cell) &&
      !taskNamePattern.test(cell)
    ) {
      return cell;
    }
  }

  // Estrategia 5: párrafos fuera de tablas (fallback — rara vez útil en emails Veeam)
  const noTables = html.replace(/<table[\s\S]*?<\/table>/gi, '');
  const blocks = [...noTables.matchAll(/<(?:p|div|li|span)[^>]*>([\s\S]*?)<\/(?:p|div|li|span)>/gi)]
    .map((m) => cellText(m[1]))
    .filter((t) => t.length > 20 && t.length < 2000 && !knownLabel.test(t) && !isDetailValue.test(t));

  return blocks[0] ?? null;
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

/**
 * Re-parsea el jobMessage de emails ya importados (por messageUid).
 * Devuelve un mapa uid → jobMessage para los que se encontró contenido.
 */
export async function reparseJobMessages(
  uids: string[],
): Promise<Map<string, string>> {
  if (uids.length === 0) return new Map();

  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_APP_PASSWORD;
  if (!email || !password) return new Map();

  const result = new Map<string, string>();
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: password },
    logger: false,
  });

  try {
    console.log(`[reparseJobMessages] conectando IMAP para ${uids.length} UIDs...`);
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const numericUids = uids.map(Number).filter(Boolean);
      console.log(`[reparseJobMessages] fetching ${numericUids.length} mensajes`);
      for await (const msg of client.fetch(numericUids, { source: true }, { uid: true })) {
        if (!msg.source) continue;
        try {
          const mail = await simpleParser(msg.source);
          const html = (mail.html || mail.textAsHtml || '').toString();
          // Log de celdas para diagnóstico
          const cells = [...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
            .map((c) => cellText(c[1])).filter((c) => c.length > 0);
          console.log(`[reparse uid=${msg.uid}] ${cells.length} celdas:`, JSON.stringify(cells.slice(0, 40)));
          const detail = parseVeeamDetails(html);
          console.log(`[reparse uid=${msg.uid}] jobMessage=`, detail?.jobMessage);
          if (detail?.jobMessage) {
            result.set(String(msg.uid), detail.jobMessage);
          }
        } catch (e) {
          console.error(`[reparse uid=${msg.uid}] error:`, e instanceof Error ? e.message : e);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return result;
}
