import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ClientService } from '../services/client-service';

const createSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  city: z.string().min(1, 'Ciudad requerida'),
  rut: z.string().min(1, 'RUT requerido'),
  phone: z.string().min(1, 'Teléfono requerido'),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  search: z.string().optional(),
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

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientService.deactivate(req.params.id);
      res.json({ data: client });
    } catch (err) {
      next(err);
    }
  },
};
