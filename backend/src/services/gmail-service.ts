import { ImapFlow } from 'imapflow';
import { BackupResult } from '@prisma/client';

export interface ParsedEmail {
  clientName: string;
  result: BackupResult;
  taskName: string;
  occurredAt: Date;
  rawSubject: string;
  messageUid: string;
}

/**
 * Parsea el asunto de un email de Veeam.
 * Formatos soportados:
 *   "CLIENTE - [Result] NombreTarea"          (formato estándar)
 *   "CLIENTE -NombreTarea[Result]"             (sin espacio post-guion, bracket pegado)
 *   "SUPPORT EXPIRED CLIENTE - [Result] ..."   (contrato expirado)
 */
export function parseVeeamSubject(subject: string): Omit<ParsedEmail, 'occurredAt' | 'messageUid'> | null {
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
      // Busca UIDs de mensajes desde sinceDate
      const uids = await client.search({ since: sinceDate }, { uid: true });

      if (uids && uids.length > 0) {
        for await (const msg of client.fetch(uids as number[], { envelope: true }, { uid: true })) {
          const subject = msg.envelope?.subject ?? '';
          const parsed = parseVeeamSubject(subject);
          if (!parsed) continue;

          results.push({
            ...parsed,
            occurredAt: msg.envelope?.date ?? new Date(),
            messageUid: String(msg.uid),
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
