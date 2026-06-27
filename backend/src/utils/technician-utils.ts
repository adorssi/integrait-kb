import { Technician } from '@prisma/client';

// failedLoginAttempts es un contador interno — no se expone en la API
export type TechnicianPublic = Omit<Technician, 'passwordHash' | 'failedLoginAttempts'>;

export function toPublic(technician: Technician): TechnicianPublic {
  const { passwordHash: _p, failedLoginAttempts: _f, ...pub } = technician;
  return pub;
}
