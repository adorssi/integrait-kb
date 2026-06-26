import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Technician } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthStore {
  token: string | null;
  technician: Technician | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      technician: null,

      login: async (email, password) => {
        const { token, technician } = await authService.login(email, password);
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
