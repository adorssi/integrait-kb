import { prisma } from '../utils/prisma';
import { Technician } from '@prisma/client';
import { ICreateTechnicianDTO, IUpdateTechnicianDTO } from '../models/types';

export const TechnicianRepository = {
  async findAll(): Promise<Technician[]> {
    return prisma.technician.findMany({ orderBy: { name: 'asc' } });
  },

  async findByEmail(email: string): Promise<Technician | null> {
    return prisma.technician.findUnique({ where: { email } });
  },

  async findById(id: string): Promise<Technician | null> {
    return prisma.technician.findUnique({ where: { id } });
  },

  async create(data: Omit<ICreateTechnicianDTO, 'password'> & { passwordHash: string }): Promise<Technician> {
    return prisma.technician.create({ data });
  },

  async update(id: string, data: Partial<Omit<IUpdateTechnicianDTO, 'password'> & { passwordHash?: string }>): Promise<Technician> {
    return prisma.technician.update({ where: { id }, data });
  },

  async deactivate(id: string): Promise<Technician> {
    return prisma.technician.update({ where: { id }, data: { active: false } });
  },

  async activate(id: string): Promise<Technician> {
    return prisma.technician.update({ where: { id }, data: { active: true } });
  },

  /** Incrementa el contador de intentos fallidos y retorna el nuevo valor */
  async incrementFailedAttempts(id: string): Promise<number> {
    const updated = await prisma.technician.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    return updated.failedLoginAttempts;
  },

  /** Establece la fecha hasta la que la cuenta está bloqueada */
  async setLock(id: string, lockedUntil: Date): Promise<void> {
    await prisma.technician.update({ where: { id }, data: { lockedUntil } });
  },

  /** Resetea el contador de intentos y elimina el bloqueo */
  async resetFailedAttempts(id: string): Promise<void> {
    await prisma.technician.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  },

  /** Activa o desactiva la exigencia de 2FA para el técnico */
  async setTotpRequired(id: string, required: boolean): Promise<void> {
    await prisma.technician.update({ where: { id }, data: { twoFactorRequired: required } });
  },

  /** Guarda el secreto TOTP cifrado y habilita el 2FA */
  async enableTotp(id: string, encryptedSecret: string): Promise<void> {
    await prisma.technician.update({
      where: { id },
      data: { twoFactorEnabled: true, totpSecret: encryptedSecret },
    });
  },

  /** Elimina el secreto TOTP y deshabilita el 2FA */
  async disableTotp(id: string): Promise<void> {
    await prisma.technician.update({
      where: { id },
      data: { twoFactorEnabled: false, totpSecret: null },
    });
  },
};
