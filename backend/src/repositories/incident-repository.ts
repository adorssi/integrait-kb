import { prisma } from '../utils/prisma';
import { Incident, Prisma } from '@prisma/client';
import { ICreateIncidentDTO, IUpdateIncidentDTO, IIncidentFilters } from '../models/types';

// Relaciones incluidas en la mayoría de las respuestas
const incidentInclude = {
  client: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  equipment: { select: { id: true, name: true } },
  tags: true,
  solution: true,
} satisfies Prisma.IncidentInclude;

export const IncidentRepository = {
  async findAll(filters: IIncidentFilters = {}) {
    const where: Prisma.IncidentWhereInput = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.technicianId) where.technicianId = filters.technicianId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.equipmentId) where.equipmentId = filters.equipmentId;

    return prisma.incident.findMany({
      where,
      include: incidentInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.incident.findUnique({ where: { id }, include: incidentInclude });
  },

  async create(data: ICreateIncidentDTO) {
    const { tagIds, ...rest } = data;
    return prisma.incident.create({
      data: {
        ...rest,
        tags: tagIds?.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      },
      include: incidentInclude,
    });
  },

  async update(id: string, data: IUpdateIncidentDTO) {
    const { tagIds, ...rest } = data;
    return prisma.incident.update({
      where: { id },
      data: {
        ...rest,
        tags: tagIds !== undefined ? { set: tagIds.map((id) => ({ id })) } : undefined,
      },
      include: incidentInclude,
    });
  },

  async updateStatus(id: string, status: string) {
    return prisma.incident.update({
      where: { id },
      data: { status: status as Incident['status'] },
      include: incidentInclude,
    });
  },

  async assignTechnician(id: string, technicianId: string | null) {
    return prisma.incident.update({
      where: { id },
      data: { technicianId },
      include: incidentInclude,
    });
  },

  async createSolution(incidentId: string, description: string, timeSpentMinutes: number) {
    return prisma.solution.create({
      data: { incidentId, description, timeSpentMinutes },
    });
  },
};
