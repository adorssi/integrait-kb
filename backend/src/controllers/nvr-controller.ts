import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { NVRService } from '../services/nvr-service';
import { safeName, safeText, ipAddress, deviceCredential } from '../utils/validators';

const createSchema = z.object({
  name: safeName,
  ip: ipAddress,
  port: z.number().int().min(1).max(65535).optional(),
  brand: safeText.optional(),
  model: safeText.optional(),
  notes: safeText.optional(),
  username: deviceCredential.optional(),
  password: deviceCredential.optional(),
});

const updateSchema = createSchema.partial().extend({
  username: deviceCredential.nullable().optional(),
  password: deviceCredential.nullable().optional(),
});

export const NVRController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await NVRService.list(req.params.clientId);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = createSchema.parse(req.body);
      const data = await NVRService.create(req.params.clientId, body);
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = updateSchema.parse(req.body);
      const data = await NVRService.update(req.params.nvrId, body);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async getCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await NVRService.getCredentials(req.params.nvrId);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NVRService.deactivate(req.params.nvrId);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
