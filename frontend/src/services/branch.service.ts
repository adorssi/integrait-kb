import { api } from './api';
import { ApiResponse, Branch, NetworkSegment, ImportResult } from '@/types';

type BranchPayload = {
  name: string;
  address?: string | null;
  publicIp?: string | null;
  dynamicIp?: boolean;
  isp?: string | null;
};

type SegmentPayload = {
  vlan?: number | null;
  networkRange: string;
  description?: string | null;
};

export const branchService = {
  async list(clientId: string): Promise<Branch[]> {
    const { data } = await api.get<ApiResponse<Branch[]>>(`/clients/${clientId}/branches`);
    return data.data;
  },

  async create(clientId: string, payload: BranchPayload): Promise<Branch> {
    const { data } = await api.post<ApiResponse<Branch>>(`/clients/${clientId}/branches`, payload);
    return data.data;
  },

  async update(clientId: string, branchId: string, payload: Partial<BranchPayload>): Promise<Branch> {
    const { data } = await api.put<ApiResponse<Branch>>(`/clients/${clientId}/branches/${branchId}`, payload);
    return data.data;
  },

  async deactivate(clientId: string, branchId: string): Promise<void> {
    await api.patch(`/clients/${clientId}/branches/${branchId}/deactivate`);
  },

  async createSegment(clientId: string, branchId: string, payload: SegmentPayload): Promise<NetworkSegment> {
    const { data } = await api.post<ApiResponse<NetworkSegment>>(
      `/clients/${clientId}/branches/${branchId}/segments`,
      payload,
    );
    return data.data;
  },

  async updateSegment(clientId: string, branchId: string, segmentId: string, payload: Partial<SegmentPayload>): Promise<NetworkSegment> {
    const { data } = await api.put<ApiResponse<NetworkSegment>>(
      `/clients/${clientId}/branches/${branchId}/segments/${segmentId}`,
      payload,
    );
    return data.data;
  },

  async deleteSegment(clientId: string, branchId: string, segmentId: string): Promise<void> {
    await api.delete(`/clients/${clientId}/branches/${branchId}/segments/${segmentId}`);
  },

  async importEquipment(clientId: string, file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ApiResponse<ImportResult>>(`/clients/${clientId}/equipment/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async importCameras(clientId: string, file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ApiResponse<ImportResult>>(`/clients/${clientId}/cameras/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
};
