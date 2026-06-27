import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { TechnicianRepository } from '../repositories/technician-repository';
import { IAuthResponse, IAuthPayload, Role } from '../models/types';
import { AppError } from '../middlewares/error-handler';
import { toPublic, TechnicianPublic } from '../utils/technician-utils';

const MAX_LOGIN_ATTEMPTS = 5;
const ADMIN_LOCK_MS = 5 * 60 * 1000; // 5 minutos
// Fecha futura usada como "bloqueo permanente" para roles no-admin
const PERMANENT_LOCK = new Date('2099-12-31T23:59:59Z');

export const AuthService = {
  /**
   * Autentica un técnico con email y password.
   * Devuelve JWT firmado + datos públicos del técnico.
   * Lanza AppError 401 si las credenciales son inválidas o la cuenta está desactivada.
   * Lanza AppError 423 si la cuenta está bloqueada (con retryAfterSeconds si aplica).
   */
  async login(email: string, password: string): Promise<IAuthResponse> {
    const technician = await TechnicianRepository.findByEmail(email);

    // Mensaje genérico para no revelar si el email existe
    if (!technician) {
      throw new AppError(401, 'Credenciales inválidas');
    }

    if (!technician.active) {
      throw new AppError(401, 'Cuenta desactivada');
    }

    // Verificar bloqueo activo
    if (technician.lockedUntil) {
      const now = new Date();
      if (technician.lockedUntil > now) {
        const isPermanent = technician.lockedUntil >= PERMANENT_LOCK;
        if (isPermanent) {
          throw new AppError(423, 'Cuenta bloqueada. Contactá al administrador.');
        }
        const retryAfterSeconds = Math.ceil(
          (technician.lockedUntil.getTime() - now.getTime()) / 1000,
        );
        throw new AppError(423, 'Cuenta bloqueada temporalmente.', { retryAfterSeconds });
      }
      // Bloqueo expirado (admin auto-desbloqueo)
      await TechnicianRepository.resetFailedAttempts(technician.id);
    }

    const passwordMatch = await bcrypt.compare(password, technician.passwordHash);
    if (!passwordMatch) {
      const newAttempts = await TechnicianRepository.incrementFailedAttempts(technician.id);
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil =
          technician.role === 'ADMIN'
            ? new Date(Date.now() + ADMIN_LOCK_MS)
            : PERMANENT_LOCK;
        await TechnicianRepository.setLock(technician.id, lockedUntil);
      }
      throw new AppError(401, 'Credenciales inválidas');
    }

    // Login exitoso — resetear contador de intentos fallidos
    if (technician.failedLoginAttempts > 0) {
      await TechnicianRepository.resetFailedAttempts(technician.id);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no configurado');

    const payload: IAuthPayload = {
      sub: technician.id,
      email: technician.email,
      role: technician.role as Role,
    };

    const token = jwt.sign(payload, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    } as jwt.SignOptions);

    return { token, technician: toPublic(technician) };
  },

  async getMe(technicianId: string): Promise<TechnicianPublic> {
    const technician = await TechnicianRepository.findById(technicianId);
    if (!technician) {
      throw new AppError(404, 'Técnico no encontrado');
    }
    return toPublic(technician);
  },
};
