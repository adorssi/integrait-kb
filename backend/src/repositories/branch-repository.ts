import { prisma } from '../utils/prisma';

export const BranchRepository = {
  async findByClientId(clientId: string) {
    return prisma.branch.findMany({
      where: { clientId, active: true },
      include: {
        segments: { where: { active: true }, orderBy: { vlan: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.branch.findUnique({
      where: { id },
      include: {
        segments: { where: { active: true }, orderBy: { vlan: 'asc' } },
      },
    });
  },

  async create(data: {
    clientId: string;
    name: string;
    address?: string | null;
    publicIp?: string | null;
    dynamicIp?: boolean;
    isp?: string | null;
  }) {
    return prisma.branch.create({ data, include: { segments: true } });
  },

  async update(id: string, data: {
    name?: string;
    address?: string | null;
    publicIp?: string | null;
    dynamicIp?: boolean;
    isp?: string | null;
  }) {
    return prisma.branch.update({
      where: { id },
      data,
      include: { segments: { where: { active: true } } },
    });
  },

  async deactivate(id: string) {
    return prisma.branch.update({ where: { id }, data: { active: false } });
  },

  async createSegment(data: {
    branchId: string;
    vlan?: number | null;
    networkRange: string;
    description?: string | null;
  }) {
    return prisma.networkSegment.create({ data });
  },

  async updateSegment(id: string, data: {
    vlan?: number | null;
    networkRange?: string;
    description?: string | null;
  }) {
    return prisma.networkSegment.update({ where: { id }, data });
  },

  async deleteSegment(id: string) {
    return prisma.networkSegment.delete({ where: { id } });
  },
};
