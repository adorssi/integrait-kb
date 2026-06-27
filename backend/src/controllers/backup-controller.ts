import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BackupService } from '../services/backup-service';
import { BackupRepository } from '../repositories/backup-repository';
import { parseVeeamSubject } from '../services/gmail-service';

const listQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const BackupController = {
  /** POST /backups/sync — sincronización manual (solo ADMIN) */
  async sync(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await BackupService.sync();
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  /** GET /clients/:id/backups */
  async listByClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { year, month } = listQuerySchema.parse(req.query);
      const jobs = await BackupService.listByClient(req.params.id, year, month);
      res.json({ data: jobs });
    } catch (err) {
      next(err);
    }
  },

  /** GET /clients/:id/backups/latest */
  async latestByClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await BackupService.latestByClient(req.params.id);
      res.json({ data: job ?? null });
    } catch (err) {
      next(err);
    }
  },

  /** GET /backups/failed-clients — clientes cuyo último backup registrado es FAILURE */
  async failedClients(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clients = await BackupService.clientsWithLastFailure();
      res.json({ data: clients });
    } catch (err) {
      next(err);
    }
  },

  /** GET /backups/unmatched-names — nombres distintos de clientes en emails sin asignar */
  async unmatchedNames(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawSubjects = await BackupRepository.findUnmatchedClientNames();
      // Parsea los rawSubjects para extraer el nombre del cliente tal como viene en el email
      const names = [...new Set(
        rawSubjects
          .map((s) => parseVeeamSubject(s)?.clientName ?? null)
          .filter((n): n is string => n !== null),
      )];
      res.json({ data: names });
    } catch (err) {
      next(err);
    }
  },

  /** GET /backups/status */
  async status(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In-memory: cuándo se ejecutó el sync en esta sesión del servidor
      const inMemory = BackupService.getLastSyncRanAt();
      // Fallback a DB: createdAt del job más reciente (persiste entre reinicios)
      const dbFallback = inMemory ? null : await BackupRepository.findMostRecentJobDate();
      const lastSync = inMemory ?? dbFallback;
      res.json({
        data: {
          lastSync: lastSync?.toISOString() ?? null,
          configured: !!(process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD),
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
