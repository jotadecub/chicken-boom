import { api } from './client';
import type { Usuario, Rol } from '@/types';

export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

export type ActualizarUsuarioInput = Partial<Omit<CrearUsuarioInput, 'password'>> & {
  password?: string;
};

export async function obtenerUsuarios(): Promise<Usuario[]> {
  const { data } = await api.get<Usuario[]>('/usuarios');
  return data;
}

export async function crearUsuario(input: CrearUsuarioInput): Promise<Usuario> {
  const { data } = await api.post<Usuario>('/usuarios', input);
  return data;
}

export async function actualizarUsuario(id: string, input: ActualizarUsuarioInput): Promise<Usuario> {
  const { data } = await api.put<Usuario>(`/usuarios/${id}`, input);
  return data;
}

export async function desactivarUsuario(id: string): Promise<void> {
  await api.delete(`/usuarios/${id}`);
}