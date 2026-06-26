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
};
