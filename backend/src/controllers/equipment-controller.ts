import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EquipmentService } from '../services/equipment-service';

const createSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  ip: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  os: z.string().optional(),
  notes: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  branchId: z.string().uuid().optional().nullable(),
});

const updateSchema = createSchema.extend({
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
}).partial();

export const EquipmentController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const equipment = await EquipmentService.listByClient(req.params.clientId);
      res.json({ data: equipment });
    } catch (err) {
      next(err);
    }
  },

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const equipment = await EquipmentService.getDetail(req.params.clientId, req.params.id);
      res.json({ data: equipment });
    } catch (err) {
      next(err);
    }
  },

  async getCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creds = await EquipmentService.getCredentials(req.params.clientId, req.params.id);
      res.json({ data: creds });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createSchema.parse(req.body);
      const equipment = await EquipmentService.create(req.params.clientId, data);
      res.status(201).json({ data: equipment });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateSchema.parse(req.body);
      const equipment = await EquipmentService.update(req.params.clientId, req.params.id, data);
      res.json({ data: equipment });
    } catch (err) {
      next(err);
    }
  },

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const equipment = await EquipmentService.deactivate(req.params.clientId, req.params.id);
      res.json({ data: equipment });
    } catch (err) {
      next(err);
    }
  },
};
