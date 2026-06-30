import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ClientService } from '../services/client-service';
import { safeName, safeShortText, safeText, safeEmail } from '../utils/validators';

// Convierte string vacío a null antes de validar (campos opcionales únicos como rut)
const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? null : v), schema);

const createSchema = z.object({
  name: safeName,
  city: safeName,
  rut: emptyToNull(safeShortText.optional().nullable()),
  phone: emptyToNull(safeShortText.optional().nullable()),
  email: emptyToNull(safeEmail.optional().nullable()),
  address: emptyToNull(safeShortText.optional().nullable()),
  notes: emptyToNull(safeText.optional().nullable()),
  servicePlan: emptyToNull(safeShortText.optional().nullable()),
  contractStart: z.coerce.date().optional().nullable(),
  contractEnd: z.coerce.date().optional().nullable(),
  hasBranches: z.boolean().optional(),
  hasCameras: z.boolean().optional(),
  hasBackups: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

const infrastructureSchema = z.object({
  servicePlan: safeShortText.optional().nullable(),
  contractStart: z.coerce.date().optional().nullable(),
  contractEnd: z.coerce.date().optional().nullable(),
  email: safeEmail.optional().nullable(),
  address: safeShortText.optional().nullable(),
  notes: safeText.optional().nullable(),
  hasBranches: z.boolean().optional(),
  hasCameras: z.boolean().optional(),
  hasBackups: z.boolean().optional(),
});

const listQuerySchema = z.object({
  search: z.string().max(255).optional(),
});

export const ClientController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search } = listQuerySchema.parse(req.query);
      const clients = await ClientService.list({ search });
      res.json({ data: clients });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientService.getById(req.params.id);
      res.json({ data: client });
    } catch (err) {
      next(err);
    }
  },

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientService.getDetail(req.params.id);
      res.json({ data: client });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createSchema.parse(req.body);
      const client = await ClientService.create(data);
      res.status(201).json({ data: client });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateSchema.parse(req.body);
      const client = await ClientService.update(req.params.id, data);
      res.json({ data: client });
    } catch (err) {
      next(err);
    }
  },

  async updateInfrastructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = infrastructureSchema.parse(req.body);
      const client = await ClientService.update(req.params.id, data);
      res.json({ data: client });
    } catch (err) {
      next(err);
    }
  },

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientService.deactivate(req.params.id);
      res.json({ data: client });
    } catch (err) {
      next(err);
    }
  },

  async reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientService.reactivate(req.params.id);
      res.json({ data: client });
    } catch (err) {
      next(err);
    }
  },
};
