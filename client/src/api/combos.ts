import { api } from './client';
import type { Combo } from '@/types';

export interface ItemComboInput {
  productoId: string;
  cantidad: number;
}

export interface CrearComboInput {
  nombre: string;
  descripcion?: string;
  precioCombo: number;
  imagenUrl?: string;
  items: ItemComboInput[];
}

export type ActualizarComboInput = Partial<CrearComboInput>;

export async function crearCombo(input: CrearComboInput): Promise<Combo> {
  const { data } = await api.post<Combo>('/combos', input);
  return data;
}

export async function actualizarCombo(id: string, input: ActualizarComboInput): Promise<Combo> {
  const { data } = await api.put<Combo>(`/combos/${id}`, input);
  return data;
}

export async function desactivarCombo(id: string): Promise<void> {
  await api.delete(`/combos/${id}`);
}