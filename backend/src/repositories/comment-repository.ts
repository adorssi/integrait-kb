import { prisma } from '../utils/prisma';

export const CommentRepository = {
  async findByIncident(incidentId: string) {
    return prisma.comment.findMany({
      where: { incidentId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },

  async create(data: { content: string; incidentId: string; technicianId: string }) {
    return prisma.comment.create({
      data,
      include: { author: { select: { id: true, name: true } } },
    });
  },

  async delete(id: string) {
    return prisma.comment.delete({ where: { id } });
  },

  async findById(id: string) {
    return prisma.comment.findUnique({ where: { id } });
  },
};
