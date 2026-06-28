import { api } from './api';
import { AuthResponse, LoginResponse, TotpSetupData } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
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

  async setup2fa(): Promise<TotpSetupData> {
    const { data } = await api.post<{ data: TotpSetupData }>('/auth/2fa/setup');
    return data.data;
  },

  async enable2fa(secret: string, code: string): Promise<void> {
    await api.post('/auth/2fa/enable', { secret, code });
  },

  async disable2fa(code: string): Promise<void> {
    await api.post('/auth/2fa/disable', { code });
  },

  async verifyTotpLogin(tempToken: string, code: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/2fa/login', { tempToken, code });
    return data;
  },

  async adminDisable2fa(technicianId: string): Promise<void> {
    await api.delete(`/technicians/${technicianId}/2fa`);
  },
};
