import { api } from './client';
import type { Promocion, TipoPromocion } from '@/types';

export interface CrearPromocionInput {
  nombre: string;
  tipo: TipoPromocion;
  valor?: number;
  productoId?: string;
  comboId?: string;
  categoriaId?: string;
  fechaInicio: string;
  fechaFin: string;
}

export async function obtenerTodasLasPromociones(): Promise<Promocion[]> {
  const { data } = await api.get<Promocion[]>('/promociones/todas');
  return data;
}

export async function crearPromocion(input: CrearPromocionInput): Promise<Promocion> {
  const { data } = await api.post<Promocion>('/promociones', input);
  return data;
}

export async function desactivarPromocion(id: string): Promise<void> {
  await api.delete(`/promociones/${id}`);
}