import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Agrega el JWT en cada request si existe
api.interceptors.request.use((config) => {
  // Lee desde Zustand persist — clave 'auth-storage'
  const raw = localStorage.getItem('auth-storage');
  const token: string | null = raw ? (JSON.parse(raw)?.state?.token ?? null) : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirige a login en 401, excepto cuando el propio login falla (no redirigir en bucle)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
