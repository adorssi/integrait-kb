import { Technician } from '@prisma/client';

export type TechnicianPublic = Omit<Technician, 'passwordHash'>;

export function toPublic(technician: Technician): TechnicianPublic {
  const { passwordHash: _, ...pub } = technician;
  return pub;
}
