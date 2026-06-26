import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TechnicianService } from '../services/technician-service';

const createSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Password debe tener al menos 8 caracteres'),
  role: z.enum(['TECHNICIAN', 'ADMIN']).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email('Email inválido').optional(),
  password: z.string().min(8, 'Password debe tener al menos 8 caracteres').optional(),
  role: z.enum(['TECHNICIAN', 'ADMIN']).optional(),
});

export const TechnicianController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const technicians = await TechnicianService.list();
      res.json({ data: technicians });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const technician = await TechnicianService.getById(req.params.id);
      res.json({ data: technician });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createSchema.parse(req.body);
      const technician = await TechnicianService.create(data);
      res.status(201).json({ data: technician });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateSchema.parse(req.body);
      const requesterId = req.technician!.sub;
      const technician = await TechnicianService.update(req.params.id, data, requesterId);
      res.json({ data: technician });
    } catch (err) {
      next(err);
    }
  },

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requesterId = req.technician!.sub;
      const technician = await TechnicianService.deactivate(req.params.id, requesterId);
      res.json({ data: technician });
    } catch (err) {
      next(err);
    }
  },
};
