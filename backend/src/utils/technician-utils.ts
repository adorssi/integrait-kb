import { Technician } from '@prisma/client';

// Campos internos nunca expuestos en la API
export type TechnicianPublic = Omit<Technician, 'passwordHash' | 'failedLoginAttempts' | 'totpSecret'>;

export function toPublic(technician: Technician): TechnicianPublic {
  const { passwordHash: _p, failedLoginAttempts: _f, totpSecret: _t, ...pub } = technician;
  return pub;
}
