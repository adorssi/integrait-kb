import { api } from './api';
import { Camera, Credentials, ApiResponse } from '@/types';

export interface CameraForm {
  nvrId?: string | null;
  name: string;
  ip?: string;
  channel?: number;
  location?: string;
  brand?: string;
  model?: string;
  username?: string;
  password?: string;
}

export const camerasService = {
  async list(clientId: string, filters?: { nvrId?: string; search?: string }): Promise<Camera[]> {
    const { data } = await api.get<ApiResponse<Camera[]>>(`/clients/${clientId}/cameras`, { params: filters });
    return data.data;
  },

  async create(clientId: string, body: CameraForm): Promise<Camera> {
    const { data } = await api.post<ApiResponse<Camera>>(`/clients/${clientId}/cameras`, body);
    return data.data;
  },

  async update(clientId: string, cameraId: string, body: Partial<CameraForm>): Promise<Camera> {
    const { data } = await api.put<ApiResponse<Camera>>(`/clients/${clientId}/cameras/${cameraId}`, body);
    return data.data;
  },

  async getCredentials(clientId: string, cameraId: string): Promise<Credentials> {
    const { data } = await api.get<ApiResponse<Credentials>>(`/clients/${clientId}/cameras/${cameraId}/credentials`);
    return data.data;
  },

  async deactivate(clientId: string, cameraId: string): Promise<void> {
    await api.patch(`/clients/${clientId}/cameras/${cameraId}/deactivate`);
  },
};
