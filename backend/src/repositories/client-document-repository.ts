import { prisma } from '../utils/prisma';

export const ClientDocumentRepository = {
  async findByClient(clientId: string) {
    return prisma.clientDocument.findMany({
      where: { clientId },
      orderBy: { uploadedAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.clientDocument.findUnique({ where: { id } });
  },

  async create(data: {
    clientId: string;
    filename: string;
    mimeType: string;
    size: number;
    storagePath: string;
  }) {
    return prisma.clientDocument.create({ data });
  },

  async delete(id: string) {
    return prisma.clientDocument.delete({ where: { id } });
  },
};
