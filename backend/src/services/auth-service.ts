import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { TechnicianRepository } from '../repositories/technician-repository';
import { IAuthResponse, IAuthPayload, Role } from '../models/types';
import { AppError } from '../middlewares/error-handler';
import { toPublic } from '../utils/technician-utils';

export const AuthService = {
  /**
   * Autentica un técnico con email y password.
   * Devuelve JWT firmado + datos públicos del técnico.
   * Lanza AppError 401 si las credenciales son inválidas o el técnico está inactivo.
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

    const passwordMatch = await bcrypt.compare(password, technician.passwordHash);
    if (!passwordMatch) {
      throw new AppError(401, 'Credenciales inválidas');
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

  /**
   * Devuelve los datos públicos del técnico autenticado dado su ID.
   * Lanza AppError 404 si no existe (caso borde: técnico eliminado tras login).
   */
  async getMe(technicianId: string): Promise<Omit<Technician, 'passwordHash'>> {
    const technician = await TechnicianRepository.findById(technicianId);
    if (!technician) {
      throw new AppError(404, 'Técnico no encontrado');
    }
    return toPublic(technician);
  },
};
