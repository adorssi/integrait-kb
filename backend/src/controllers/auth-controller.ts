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

const totpCodeSchema = z.object({
  code: z.string().length(6, 'El código debe tener 6 dígitos').regex(/^\d+$/, 'Solo dígitos'),
});

const enableTotpSchema = z.object({
  secret: z.string().min(10),
  code: z.string().length(6).regex(/^\d+$/),
});

const verifyLoginSchema = z.object({
  tempToken: z.string().min(10),
  code: z.string().length(6).regex(/^\d+$/, 'Solo dígitos'),
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

  /** Devuelve secreto TOTP + QR data URL para iniciar el setup. No persiste nada. */
  async setup2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AuthService.setupTotp(req.technician!.sub);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  /** Verifica el primer código TOTP y activa el 2FA guardando el secreto cifrado. */
  async enable2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { secret, code } = enableTotpSchema.parse(req.body);
      await AuthService.enableTotp(req.technician!.sub, secret, code);
      res.json({ data: { message: '2FA activado correctamente.' } });
    } catch (err) {
      next(err);
    }
  },

  /** Verifica el código TOTP y desactiva el 2FA del técnico autenticado. */
  async disable2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = totpCodeSchema.parse(req.body);
      await AuthService.disableTotp(req.technician!.sub, code);
      res.json({ data: { message: '2FA desactivado correctamente.' } });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Segundo paso del login cuando el técnico tiene 2FA habilitado.
   * Recibe el tempToken (obtenido en /login) y el código TOTP.
   * No requiere el middleware authenticate porque el tempToken actúa como credencial temporal.
   */
  async verifyTotpLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tempToken, code } = verifyLoginSchema.parse(req.body);
      const result = await AuthService.verifyTotpLogin(tempToken, code);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
