import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IAuthPayload, Role } from '../models/types';
import { AppError } from './error-handler';

// Extensión del tipo Request para incluir el técnico autenticado
declare global {
  namespace Express {
    interface Request {
      technician?: IAuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token de autenticación requerido'));
  }

  const token = authHeader.substring(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no configurado');

    const payload = jwt.verify(token, secret) as IAuthPayload;
    req.technician = payload;
    next();
  } catch {
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
