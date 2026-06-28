import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TechnicianService } from '../services/technician-service';
import { AuthService } from '../services/auth-service';
import { Role } from '../models/types';
import { safeName, safeEmail, strongPassword } from '../utils/validators';

const createSchema = z.object({
  name: safeName,
  email: safeEmail,
  password: strongPassword,
  role: z.enum(['TECHNICIAN', 'ADMIN']).optional(),
});

const updateSchema = z.object({
  name: safeName.optional(),
  email: safeEmail.optional(),
  password: strongPassword.optional(),
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
      const technician = await TechnicianService.create({ ...data, role: data.role as Role | undefined });
      res.status(201).json({ data: technician });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateSchema.parse(req.body);
      const requesterId = req.technician!.sub;
      const technician = await TechnicianService.update(req.params.id, { ...data, role: data.role as Role | undefined }, requesterId);
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

  async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const technician = await TechnicianService.activate(req.params.id);
      res.json({ data: technician });
    } catch (err) {
      next(err);
    }
  },

  async unlock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requesterId = req.technician!.sub;
      const technician = await TechnicianService.unlock(req.params.id, requesterId);
      res.json({ data: technician });
    } catch (err) {
      next(err);
    }
  },

  /** Solo ADMIN. Activa o desactiva la exigencia de 2FA para un técnico. */
  async requireTotp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { required } = z.object({ required: z.boolean() }).parse(req.body);
      const technician = await TechnicianService.requireTotp(req.params.id, required);
      res.json({ data: technician });
    } catch (err) {
      next(err);
    }
  },

  /** Solo ADMIN. Deshabilita el 2FA de cualquier técnico (recuperación de acceso). */
  async adminDisable2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.adminDisableTotp(req.params.id);
      res.json({ data: { message: '2FA desactivado por administrador.' } });
    } catch (err) {
      next(err);
    }
  },
};
