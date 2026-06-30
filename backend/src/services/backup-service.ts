import { prisma } from '../utils/prisma';
import { fetchBackupEmails, parseVeeamSubject, reparseJobMessages } from './gmail-service';
import { BackupRepository } from '../repositories/backup-repository';

export interface SyncResult {
  imported: number;
  skipped: number;
  rematched: number;   // jobs históricos sin cliente que ahora tienen match
  unmatched: string[]; // nombres de clientes que siguen sin match
  syncRanAt: string;
}

// Persiste en memoria hasta el próximo reinicio del servidor
let lastSyncRanAt: Date | null = null;

/**
 * Normaliza un nombre para comparación: minúsculas, sin acentos,
 * sin puntuación y espacios simples.
 */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // elimina diacríticos (á→a, etc.)
    .replace(/[^a-z0-9\s]/g, ' ')   // reemplaza puntuación por espacio
    .replace(/\s+/g, ' ')           // colapsa espacios múltiples
    .trim();
}

/**
 * Extrae palabras significativas (> 2 caracteres) de un nombre normalizado.
 */
function keywords(normalized: string): string[] {
  const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'the', 'and', 'y', 'e', 'sa', 'srl', 'sas', 'spa']);
  return normalized.split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Función pura: busca un clientId dado un nombre parseado del email.
 * Estrategias en orden de prioridad:
 *   1. Match exacto (después de normalizar)
 *   2. Contains en ambas direcciones (normalizado)
 *   3. Match por palabras clave: al menos 1 palabra significativa en común
 */
function findClientId(
  clients: { id: string; name: string }[],
  clientName: string,
): string | null {
  const norm = normalizeName(clientName);

  // 1. Exacto
  const exact = clients.find((c) => normalizeName(c.name) === norm);
  if (exact) return exact.id;

  // 2. Contains
  const contains = clients.find(
    (c) =>
      normalizeName(c.name).includes(norm) ||
      norm.includes(normalizeName(c.name)),
  );
  if (contains) return contains.id;

  // 3. Palabra clave compartida (solo palabras > 2 chars, sin stopwords)
  const emailKw = keywords(norm);
  if (emailKw.length === 0) return null;

  const kwMatch = clients.find((c) => {
    const clientKw = keywords(normalizeName(c.name));
    return emailKw.some((w) => clientKw.includes(w));
  });
  return kwMatch?.id ?? null;
}

export const BackupService = {
  async sync(): Promise<SyncResult> {
    // Carga clientes una sola vez para no hacer N queries en el loop
    const clients = await prisma.client.findMany({
      where: { active: true },
      select: { id: true, name: true },
    });

    // Ventana fija configurable: busca siempre N días hacia atrás.
    // La deduplicación por messageUid evita importar el mismo email dos veces.
    // No usar getLastOccurredAt() como límite porque emails de clientes sin match
    // quedarían excluidos si hay emails más recientes de otros clientes ya importados.
    const syncDays = parseInt(process.env.GMAIL_SYNC_DAYS ?? '90', 10);
    const since = new Date(Date.now() - syncDays * 24 * 60 * 60 * 1000);
    const emails = await fetchBackupEmails(since);

    let imported = 0;
    let skipped = 0;
    let rematched = 0;
    const unmatchedNames = new Set<string>();

    // --- Paso 1: procesar emails nuevos ---
    for (const email of emails) {
      const clientId = findClientId(clients, email.clientName);
      if (!clientId) unmatchedNames.add(email.clientName);

      const existing = await BackupRepository.findByMessageUid(email.messageUid);
      if (existing) {
        // Si antes no tenía cliente y ahora podemos asignarlo, aprovechamos
        if (!existing.clientId && clientId) {
          await BackupRepository.updateClientId(existing.id, clientId);
          rematched++;
        }
        skipped++;
        continue;
      }

      await BackupRepository.create({
        clientId,
        taskName: email.taskName,
        result: email.result,
        occurredAt: email.occurredAt,
        rawSubject: email.rawSubject,
        messageUid: email.messageUid,
        startTime:       email.detail?.startTime ?? null,
        endTime:         email.detail?.endTime ?? null,
        dataSize:        email.detail?.dataSize ?? null,
        dataRead:        email.detail?.dataRead ?? null,
        dataTransferred: email.detail?.dataTransferred ?? null,
        duration:        email.detail?.duration ?? null,
        jobMessage:   email.detail?.jobMessage ?? null,
      });
      imported++;
    }

    // --- Paso 2: re-matchear jobs históricos sin cliente ---
    // Cubre el caso de clientes dados de alta DESPUÉS de la primer importación
    const unmatchedJobs = await BackupRepository.findUnmatched();
    for (const job of unmatchedJobs) {
      const parsed = parseVeeamSubject(job.rawSubject);
      if (!parsed) continue;

      const clientId = findClientId(clients, parsed.clientName);
      if (clientId) {
        await BackupRepository.updateClientId(job.id, clientId);
        rematched++;
        unmatchedNames.delete(parsed.clientName);
      } else {
        unmatchedNames.add(parsed.clientName);
      }
    }

    // --- Paso 3: rellenar jobMessage en jobs importados antes de que existiera el campo ---
    const nullMessageJobs = await BackupRepository.findWithNullJobMessage();
    if (nullMessageJobs.length > 0) {
      const uids = nullMessageJobs.map((j) => j.messageUid);
      try {
        const parsed = await reparseJobMessages(uids);
        for (const job of nullMessageJobs) {
          const msg = parsed.get(job.messageUid);
          if (msg) await BackupRepository.updateJobMessage(job.id, msg);
        }
      } catch {
        // No interrumpir la sync si falla el re-parseo
      }
    }

    lastSyncRanAt = new Date();

    return {
      imported,
      skipped,
      rematched,
      unmatched: Array.from(unmatchedNames),
      syncRanAt: lastSyncRanAt.toISOString(),
    };
  },

  getLastSyncRanAt(): Date | null {
    return lastSyncRanAt;
  },

  async listByClient(clientId: string, year?: number, month?: number) {
    return BackupRepository.findByClient(clientId, year, month);
  },

  async latestByClient(clientId: string) {
    return BackupRepository.findLatestByClient(clientId);
  },

  async clientsWithLastFailure() {
    return BackupRepository.findClientsWithLastFailure();
  },

  async allClientsStatus() {
    return BackupRepository.findLatestPerClient();
  },
};
