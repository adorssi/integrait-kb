import { prisma } from '../utils/prisma';
import { Equipment } from '@prisma/client';
import { ICreateEquipmentDTO, IUpdateEquipmentDTO, IEquipmentCredentials } from '../models/types';

export const EquipmentRepository = {
  async findByClient(clientId: string): Promise<(Equipment & { hasCredentials: boolean })[]> {
    const rows = await prisma.equipment.findMany({
      where: { clientId, active: true },
      orderBy: { name: 'asc' },
    });
    return rows.map(e => ({
      ...e,
      hasCredentials: !!(e.encryptedUsername || e.encryptedPassword),
    }));
  },

  async findById(id: string): Promise<Equipment | null> {
    return prisma.equipment.findUnique({ where: { id } });
  },

  async findByIdWithIncidents(id: string) {
    const e = await prisma.equipment.findUnique({
      where: { id },
      include: {
        incidents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            assignedTo: { select: { id: true, name: true } },
            tags: true,
          },
        },
      },
    });
    if (!e) return null;
    return { ...e, hasCredentials: !!(e.encryptedUsername || e.encryptedPassword) };
  },

  async getCredentials(id: string): Promise<IEquipmentCredentials> {
    const e = await prisma.equipment.findUnique({
      where: { id },
      select: { encryptedUsername: true, encryptedPassword: true },
    });
    return {
      username: e?.encryptedUsername ?? null,
      password: e?.encryptedPassword ?? null,
    };
  },

  async create(clientId: string, data: ICreateEquipmentDTO): Promise<Equipment & { hasCredentials: boolean }> {
    const e = await prisma.equipment.create({ data: { ...data, clientId } });
    return { ...e, hasCredentials: !!(e.encryptedUsername || e.encryptedPassword) };
  },

  async update(id: string, data: IUpdateEquipmentDTO): Promise<Equipment & { hasCredentials: boolean }> {
    const e = await prisma.equipment.update({ where: { id }, data });
    return { ...e, hasCredentials: !!(e.encryptedUsername || e.encryptedPassword) };
  },

  async deactivate(id: string): Promise<Equipment> {
    return prisma.equipment.update({ where: { id }, data: { active: false } });
  },
};
