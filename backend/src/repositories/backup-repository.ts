import { prisma } from '../utils/prisma';
import { BackupResult } from '@prisma/client';

export const BackupRepository = {
  async findByClient(clientId: string, year?: number, month?: number) {
    const where: { clientId: string; occurredAt?: { gte: Date; lte: Date } } = { clientId };

    if (year !== undefined && month !== undefined) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      where.occurredAt = { gte: start, lte: end };
    }

    return prisma.backupJob.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
    });
  },

  async findByMessageUid(messageUid: string) {
    return prisma.backupJob.findUnique({ where: { messageUid } });
  },

  /** Jobs importados sin cliente — candidatos a re-matchear */
  async findUnmatched() {
    return prisma.backupJob.findMany({ where: { clientId: null } });
  },

  /** Nombres distintos de cliente que aparecen en emails sin match */
  async findUnmatchedClientNames(): Promise<string[]> {
    const jobs = await prisma.backupJob.findMany({
      where: { clientId: null },
      select: { rawSubject: true },
      distinct: ['rawSubject'],
    });
    return jobs.map((j) => j.rawSubject);
  },

  /** Asigna un cliente a un job que llegó sin match */
  async updateClientId(id: string, clientId: string) {
    return prisma.backupJob.update({ where: { id }, data: { clientId } });
  },

  async getLastOccurredAt(): Promise<Date | null> {
    const latest = await prisma.backupJob.findFirst({
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    });
    return latest?.occurredAt ?? null;
  },

  async create(data: {
    clientId: string | null;
    taskName: string;
    result: BackupResult;
    occurredAt: Date;
    rawSubject: string;
    messageUid: string;
  }) {
    return prisma.backupJob.create({ data });
  },

  async findMostRecentJobDate(): Promise<Date | null> {
    const job = await prisma.backupJob.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return job?.createdAt ?? null;
  },

  async findLatestByClient(clientId: string) {
    return prisma.backupJob.findFirst({
      where: { clientId },
      orderBy: { occurredAt: 'desc' },
      select: { result: true, occurredAt: true },
    });
  },

  /**
   * Devuelve los clientes cuyo backup más reciente es FAILURE.
   * Usa una subconsulta correlated para obtener el último job por cliente en 1 query.
   */
  async findClientsWithLastFailure(): Promise<
    { clientId: string; clientName: string; occurredAt: Date; taskName: string }[]
  > {
    return prisma.$queryRaw`
      SELECT
        bj."clientId",
        c."name"        AS "clientName",
        bj."occurredAt",
        bj."taskName"
      FROM "BackupJob" bj
      JOIN "Client" c ON c.id = bj."clientId"
      WHERE bj."clientId" IS NOT NULL
        AND bj.result = 'FAILURE'
        AND bj.id = (
          SELECT b2.id
          FROM "BackupJob" b2
          WHERE b2."clientId" = bj."clientId"
          ORDER BY b2."occurredAt" DESC
          LIMIT 1
        )
      ORDER BY bj."occurredAt" DESC
    `;
  },

  async countByClient(clientId: string) {
    return prisma.backupJob.count({ where: { clientId } });
  },
};
