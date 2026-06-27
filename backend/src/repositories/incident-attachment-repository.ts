import { prisma } from '../utils/prisma';

export const IncidentAttachmentRepository = {
  async findByIncident(incidentId: string) {
    return prisma.incidentAttachment.findMany({
      where: { incidentId },
      orderBy: { uploadedAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.incidentAttachment.findUnique({ where: { id } });
  },

  async create(data: {
    incidentId: string;
    filename: string;
    mimeType: string;
    size: number;
    storagePath: string;
  }) {
    return prisma.incidentAttachment.create({ data });
  },

  async delete(id: string) {
    return prisma.incidentAttachment.delete({ where: { id } });
  },
};
