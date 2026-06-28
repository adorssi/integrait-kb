import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Technician, AuthResponse } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthStore {
  token: string | null;
  technician: Technician | null;
  login: (email: string, password: string) => Promise<{ requiresTwoFactor?: boolean; requiresTotpSetup?: boolean; tempToken?: string }>;
  setAuth: (token: string, technician: Technician) => void;
  logout: () => void;
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      technician: null,

      login: async (email, password) => {
        const result = await authService.login(email, password);
        if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
          return { requiresTwoFactor: true, tempToken: result.tempToken };
        }
        if ('requiresTotpSetup' in result && result.requiresTotpSetup) {
          return { requiresTotpSetup: true, tempToken: result.tempToken };
        }
        const { token, technician } = result as AuthResponse;
        set({ token, technician });
        return { requiresTwoFactor: false };
      },

      setAuth: (token, technician) => {
        set({ token, technician });
      },

      logout: () => {
        set({ token: null, technician: null });
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
);

export function useAuth() {
  const store = useAuthStore();
  return {
    ...store,
    isAuthenticated: !!store.token,
    isAdmin: store.technician?.role === 'ADMIN',
  };
}

// Selector directo para el token (usado por el interceptor de Axios)
export const getAuthToken = () => useAuthStore.getState().token;
