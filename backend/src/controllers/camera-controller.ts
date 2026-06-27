import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CameraService } from '../services/camera-service';

const createSchema = z.object({
  nvrId: z.string().uuid().optional(),
  name: z.string().min(1),
  ip: z.string().optional(),
  channel: z.number().int().min(1).optional(),
  location: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  nvrId: z.string().uuid().nullable().optional(),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
});

const listQuerySchema = z.object({
  nvrId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const CameraController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nvrId, search } = listQuerySchema.parse(req.query);
      const data = await CameraService.list(req.params.clientId, { nvrId, search });
      res.json({ data });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = createSchema.parse(req.body);
      const data = await CameraService.create(req.params.clientId, body);
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = updateSchema.parse(req.body);
      const data = await CameraService.update(req.params.cameraId, body);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async getCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CameraService.getCredentials(req.params.cameraId);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CameraService.deactivate(req.params.cameraId);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
