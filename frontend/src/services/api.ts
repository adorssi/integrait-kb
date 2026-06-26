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

// Redirige a login en 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
