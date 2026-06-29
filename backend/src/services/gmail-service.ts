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
 * Busca la tabla "Details" en el HTML del email de Veeam y devuelve los datos
 * de la primera fila de datos (o null si no encuentra nada).
 *
 * La tabla tiene cabeceras: Name | Status | Start time | End time | Size | Read | Transferred | Duration
 * Índices fijos:              0      1          2           3        4      5         6             7
 */
export function parseVeeamDetails(html: string): VeeamJobDetail | null {
  if (!html) return null;

  // Localizar la sección "Details" en el HTML
  const detailsMatch = html.search(/Details/i);
  if (detailsMatch === -1) return null;

  const afterDetails = html.slice(detailsMatch);

  // Extraer todas las filas <tr>...</tr> que aparecen después de "Details"
  const rowPattern = /<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi;
  const rows: string[][] = [];

  let m: RegExpExecArray | null;
  while ((m = rowPattern.exec(afterDetails)) !== null) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((c) => cellText(c[1]));
    if (cells.length > 0) rows.push(cells);
    // Con 2 filas (encabezado + 1 dato) ya tenemos suficiente
    if (rows.length >= 10) break;
  }

  // La primera fila suele ser el encabezado; buscamos la primera fila de datos
  // con al menos 7 columnas que NO sea la cabecera
  const headerKeywords = /^(name|status|start|end|size|read|transferred|duration)$/i;
  const dataRow = rows.find(
    (row) => row.length >= 7 && !headerKeywords.test(row[0]),
  );

  if (!dataRow) return null;

  return {
    startTime:       dataRow[2] ?? null,
    endTime:         dataRow[3] ?? null,
    dataSize:        dataRow[4] ?? null,
    dataRead:        dataRow[5] ?? null,
    dataTransferred: dataRow[6] ?? null,
    duration:        dataRow[7] ?? null,
  };
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
