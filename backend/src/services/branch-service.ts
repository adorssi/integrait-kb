import { BranchRepository } from '../repositories/branch-repository';

export const BranchService = {
  async listByClient(clientId: string) {
    return BranchRepository.findByClientId(clientId);
  },

  async create(data: {
    clientId: string;
    name: string;
    address?: string | null;
    publicIp?: string | null;
    dynamicIp?: boolean;
    isp?: string | null;
  }) {
    return BranchRepository.create(data);
  },

  async update(id: string, data: {
    name?: string;
    address?: string | null;
    publicIp?: string | null;
    dynamicIp?: boolean;
    isp?: string | null;
  }) {
    const existing = await BranchRepository.findById(id);
    if (!existing) throw Object.assign(new Error('Sucursal no encontrada'), { status: 404 });
    return BranchRepository.update(id, data);
  },

  async deactivate(id: string) {
    const existing = await BranchRepository.findById(id);
    if (!existing) throw Object.assign(new Error('Sucursal no encontrada'), { status: 404 });
    return BranchRepository.deactivate(id);
  },

  async createSegment(data: {
    branchId: string;
    vlan?: number | null;
    networkRange: string;
    description?: string | null;
  }) {
    const branch = await BranchRepository.findById(data.branchId);
    if (!branch) throw Object.assign(new Error('Sucursal no encontrada'), { status: 404 });
    return BranchRepository.createSegment(data);
  },

  async updateSegment(id: string, data: {
    vlan?: number | null;
    networkRange?: string;
    description?: string | null;
  }) {
    return BranchRepository.updateSegment(id, data);
  },

  async deleteSegment(id: string) {
    return BranchRepository.deleteSegment(id);
  },
};
