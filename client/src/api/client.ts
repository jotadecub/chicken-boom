import axios from 'axios';
import { useAuthStore } from '@/store/auth';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Agrega el token a cada petición automáticamente
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el backend responde 401 (token inválido/expirado), cerramos sesión automáticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);