import { api } from './client';
import type { Producto } from '@/types';

export interface CrearProductoInput {
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string;
  categoriaId?: string;
  stockInicial?: number;
  stockMinimo?: number;
}

export type ActualizarProductoInput = Partial<CrearProductoInput>;

export async function crearProducto(input: CrearProductoInput): Promise<Producto> {
  const { data } = await api.post<Producto>('/productos', input);
  return data;
}

export async function actualizarProducto(
  id: string,
  input: ActualizarProductoInput
): Promise<Producto> {
  const { data } = await api.put<Producto>(`/productos/${id}`, input);
  return data;
}

export async function desactivarProducto(id: string): Promise<void> {
  await api.delete(`/productos/${id}`);
}