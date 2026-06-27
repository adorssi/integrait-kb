import { prisma } from '../utils/prisma';

export const ClientWifiRepository = {
  async findByClient(clientId: string) {
    return prisma.clientWifi.findMany({
      where: { clientId },
      orderBy: { ssid: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.clientWifi.findUnique({ where: { id } });
  },

  async create(data: {
    clientId: string;
    ssid: string;
    encryptedPassword?: string | null;
    location?: string | null;
    notes?: string | null;
  }) {
    return prisma.clientWifi.create({ data });
  },

  async update(id: string, data: {
    ssid?: string;
    encryptedPassword?: string | null;
    location?: string | null;
    notes?: string | null;
  }) {
    return prisma.clientWifi.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.clientWifi.delete({ where: { id } });
  },
};
