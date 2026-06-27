import { api } from './api';
import { NVR, Credentials, ApiResponse } from '@/types';

export interface NVRForm {
  name: string;
  ip: string;
  port?: number;
  brand?: string;
  model?: string;
  notes?: string;
  username?: string;
  password?: string;
}

export const nvrService = {
  async list(clientId: string): Promise<NVR[]> {
    const { data } = await api.get<ApiResponse<NVR[]>>(`/clients/${clientId}/nvrs`);
    return data.data;
  },

  async create(clientId: string, body: NVRForm): Promise<NVR> {
    const { data } = await api.post<ApiResponse<NVR>>(`/clients/${clientId}/nvrs`, body);
    return data.data;
  },

  async update(clientId: string, nvrId: string, body: Partial<NVRForm>): Promise<NVR> {
    const { data } = await api.put<ApiResponse<NVR>>(`/clients/${clientId}/nvrs/${nvrId}`, body);
    return data.data;
  },

  async getCredentials(clientId: string, nvrId: string): Promise<Credentials> {
    const { data } = await api.get<ApiResponse<Credentials>>(`/clients/${clientId}/nvrs/${nvrId}/credentials`);
    return data.data;
  },

  async deactivate(clientId: string, nvrId: string): Promise<void> {
    await api.patch(`/clients/${clientId}/nvrs/${nvrId}/deactivate`);
  },
};
