import { api } from './api';
import { ApiResponse, Technician } from '@/types';

export const techniciansService = {
  async list(): Promise<Technician[]> {
    const { data } = await api.get<ApiResponse<Technician[]>>('/technicians');
    return data.data;
  },

  async create(payload: { name: string; email: string; password: string; role?: string }): Promise<Technician> {
    const { data } = await api.post<ApiResponse<Technician>>('/technicians', payload);
    return data.data;
  },

  async update(id: string, payload: { name?: string; email?: string; password?: string; role?: string }): Promise<Technician> {
    const { data } = await api.put<ApiResponse<Technician>>(`/technicians/${id}`, payload);
    return data.data;
  },

  async deactivate(id: string): Promise<Technician> {
    const { data } = await api.patch<ApiResponse<Technician>>(`/technicians/${id}/deactivate`);
    return data.data;
  },
};
