import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ContactService } from '../services/contact-service';

const createSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const ContactController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contacts = await ContactService.listByClient(req.params.clientId);
      res.json({ data: contacts });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createSchema.parse(req.body);
      const contact = await ContactService.create(req.params.clientId, data);
      res.status(201).json({ data: contact });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateSchema.parse(req.body);
      const contact = await ContactService.update(req.params.clientId, req.params.id, data);
      res.json({ data: contact });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ContactService.delete(req.params.clientId, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
