import { api } from './api';
import { AuthResponse } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },

  async me(): Promise<AuthResponse['technician']> {
    const { data } = await api.get<{ data: AuthResponse['technician'] }>('/auth/me');
    return data.data;
  },

  async verifyPassword(password: string): Promise<boolean> {
    const { data } = await api.post<{ data: { valid: boolean } }>('/auth/verify-password', { password });
    return data.data.valid;
  },
};
