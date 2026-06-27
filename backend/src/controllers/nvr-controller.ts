import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { NVRService } from '../services/nvr-service';

const createSchema = z.object({
  name: z.string().min(1),
  ip: z.string().min(1),
  port: z.number().int().min(1).max(65535).optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  notes: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
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
