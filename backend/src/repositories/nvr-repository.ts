import { prisma } from '../utils/prisma';

export const NVRRepository = {
  async findByClient(clientId: string) {
    return prisma.nVR.findMany({
      where: { clientId, active: true },
      include: { cameras: { where: { active: true }, orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.nVR.findUnique({
      where: { id },
      include: { cameras: { where: { active: true } } },
    });
  },

  async create(data: {
    clientId: string;
    name: string;
    ip: string;
    port?: number;
    brand?: string;
    model?: string;
    notes?: string;
    encryptedUsername?: string;
    encryptedPassword?: string;
  }) {
    return prisma.nVR.create({ data });
  },

  async update(
    id: string,
    data: {
      name?: string;
      ip?: string;
      port?: number | null;
      brand?: string | null;
      model?: string | null;
      notes?: string | null;
      encryptedUsername?: string | null;
      encryptedPassword?: string | null;
    },
  ) {
    return prisma.nVR.update({ where: { id }, data });
  },

  async deactivate(id: string) {
    return prisma.nVR.update({ where: { id }, data: { active: false } });
  },
};
