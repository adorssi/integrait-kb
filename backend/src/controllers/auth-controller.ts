import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { AuthService } from '../services/auth-service';
import { TechnicianRepository } from '../repositories/technician-repository';
import { AppError } from '../middlewares/error-handler';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
});

export const AuthController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await AuthService.login(email, password);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const technicianId = req.technician!.sub;
      const technician = await AuthService.getMe(technicianId);
      res.status(200).json({ data: technician });
    } catch (err) {
      next(err);
    }
  },

  async verifyPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = z.object({ password: z.string().min(1) }).parse(req.body);
      const technician = await TechnicianRepository.findById(req.technician!.sub);
      if (!technician) throw new AppError(401, 'No autenticado');
      const valid = await bcrypt.compare(password, technician.passwordHash);
      if (!valid) throw new AppError(401, 'Contraseña incorrecta');
      res.json({ data: { valid: true } });
    } catch (err) {
      next(err);
    }
  },
};
