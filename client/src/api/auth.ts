import { api } from './client';
import type { Usuario } from '@/types';

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}