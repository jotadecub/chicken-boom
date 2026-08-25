import { api } from './client';
import type { Mesa } from '@/types';

export async function crearMesa(numero: number): Promise<Mesa> {
  const { data } = await api.post<Mesa>('/mesas', { numero });
  return data;
}

export async function eliminarMesa(id: string): Promise<void> {
  await api.delete(`/mesas/${id}`);
}