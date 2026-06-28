import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IAuthPayload, Role } from '../models/types';
import { AppError } from './error-handler';
import { TechnicianRepository } from '../repositories/technician-repository';

// Extensión del tipo Request para incluir el técnico autenticado
declare global {
  namespace Express {
    interface Request {
      technician?: IAuthPayload;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token de autenticación requerido'));
  }

  const token = authHeader.substring(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no configurado');

    const payload = jwt.verify(token, secret) as IAuthPayload;

    // Tokens temporales de 2FA no son válidos para endpoints protegidos normales
    if (payload.scope === 'totp-verify') {
      return next(new AppError(401, 'Token inválido o expirado'));
    }

    // Verificar en DB que el técnico sigue activo — garantiza revocación inmediata al deshabilitar
    const technician = await TechnicianRepository.findById(payload.sub);
    if (!technician || !technician.active) {
      return next(new AppError(401, 'Cuenta desactivada o no encontrada'));
    }

    req.technician = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError(401, 'Token inválido o expirado'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.technician) {
      return next(new AppError(401, 'No autenticado'));
    }
    if (!roles.includes(req.technician.role)) {
      return next(new AppError(403, 'Permisos insuficientes'));
    }
    next();
  };
}
