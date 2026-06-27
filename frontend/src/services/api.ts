import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

// Lee el JWT desde Zustand persist (clave 'auth-storage')
function getToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    return raw ? (JSON.parse(raw)?.state?.token ?? null) : null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // FormData: deja que el browser fije el Content-Type con el boundary correcto
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
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
