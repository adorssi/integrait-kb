import { prisma } from '../utils/prisma';
import { Equipment } from '@prisma/client';
import { ICreateEquipmentDTO, IUpdateEquipmentDTO } from '../models/types';

export const EquipmentRepository = {
  async findByClient(clientId: string): Promise<Equipment[]> {
    return prisma.equipment.findMany({
      where: { clientId, active: true },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string): Promise<Equipment | null> {
    return prisma.equipment.findUnique({ where: { id } });
  },

  async findByIdWithIncidents(id: string) {
    return prisma.equipment.findUnique({
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
  },

  async create(clientId: string, data: ICreateEquipmentDTO): Promise<Equipment> {
    return prisma.equipment.create({ data: { ...data, clientId } });
  },

  async update(id: string, data: IUpdateEquipmentDTO): Promise<Equipment> {
    return prisma.equipment.update({ where: { id }, data });
  },

  async deactivate(id: string): Promise<Equipment> {
    return prisma.equipment.update({ where: { id }, data: { active: false } });
  },
};
