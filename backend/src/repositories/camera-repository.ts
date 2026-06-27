import { prisma } from '../utils/prisma';

export const CameraRepository = {
  async findByClient(clientId: string, filters?: { nvrId?: string; search?: string }) {
    return prisma.camera.findMany({
      where: {
        clientId,
        active: true,
        ...(filters?.nvrId ? { nvrId: filters.nvrId } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { ip: { contains: filters.search, mode: 'insensitive' } },
                { location: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { nvr: { select: { id: true, name: true } } },
      orderBy: [{ nvrId: 'asc' }, { name: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.camera.findUnique({ where: { id } });
  },

  async create(data: {
    clientId: string;
    nvrId?: string;
    name: string;
    ip?: string;
    channel?: number;
    location?: string;
    brand?: string;
    model?: string;
    encryptedUsername?: string;
    encryptedPassword?: string;
  }) {
    return prisma.camera.create({ data });
  },

  async update(
    id: string,
    data: {
      nvrId?: string | null;
      name?: string;
      ip?: string | null;
      channel?: number | null;
      location?: string | null;
      brand?: string | null;
      model?: string | null;
      encryptedUsername?: string | null;
      encryptedPassword?: string | null;
    },
  ) {
    return prisma.camera.update({ where: { id }, data });
  },

  async deactivate(id: string) {
    return prisma.camera.update({ where: { id }, data: { active: false } });
  },
};
