import { prisma } from '../utils/prisma';
import { Client, Prisma } from '@prisma/client';
import { ICreateClientDTO, IUpdateClientDTO, IClientFilters } from '../models/types';

export const ClientRepository = {
  async findAll(filters: IClientFilters = {}): Promise<Client[]> {
    const where: Prisma.ClientWhereInput = { active: true };

    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    return prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string): Promise<Client | null> {
    return prisma.client.findUnique({ where: { id } });
  },

  async findByIdWithDetail(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: {
        equipment: { where: { active: true }, orderBy: { name: 'asc' } },
        contacts: { orderBy: { name: 'asc' } },
        branches: {
          where: { active: true },
          include: { segments: { where: { active: true }, orderBy: { vlan: 'asc' } } },
          orderBy: { name: 'asc' },
        },
        incidents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            assignedTo: { select: { id: true, name: true } },
            equipment: { select: { id: true, name: true } },
            tags: true,
          },
        },
      },
    });
  },

  async findByRut(rut: string): Promise<Client | null> {
    return prisma.client.findUnique({ where: { rut } });
  },

  async create(data: ICreateClientDTO): Promise<Client> {
    return prisma.client.create({ data });
  },

  async update(id: string, data: IUpdateClientDTO): Promise<Client> {
    return prisma.client.update({ where: { id }, data });
  },

  async deactivate(id: string): Promise<Client> {
    return prisma.client.update({ where: { id }, data: { active: false } });
  },
};
