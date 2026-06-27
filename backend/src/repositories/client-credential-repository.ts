import { prisma } from '../utils/prisma';

export const ClientCredentialRepository = {
  async findByClient(clientId: string) {
    return prisma.clientCredential.findMany({
      where: { clientId },
      orderBy: { service: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.clientCredential.findUnique({ where: { id } });
  },

  async create(data: {
    clientId: string;
    service: string;
    username?: string | null;
    encryptedPassword?: string | null;
    notes?: string | null;
  }) {
    return prisma.clientCredential.create({ data });
  },

  async update(id: string, data: {
    service?: string;
    username?: string | null;
    encryptedPassword?: string | null;
    notes?: string | null;
  }) {
    return prisma.clientCredential.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.clientCredential.delete({ where: { id } });
  },
};
