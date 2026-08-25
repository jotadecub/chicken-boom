import { api } from './client';
import type { Inventario, Producto } from '@/types';

export interface ItemInventario extends Inventario {
  producto: Producto;
}

export async function obtenerInventario(): Promise<ItemInventario[]> {
  const { data } = await api.get<ItemInventario[]>('/inventario');
  return data;
}

export async function obtenerAlertasStock(): Promise<ItemInventario[]> {
  const { data } = await api.get<ItemInventario[]>('/inventario/alertas');
  return data;
}

export async function ajustarStock(
  productoId: string,
  cambios: { stockActual?: number; stockMinimo?: number }
): Promise<ItemInventario> {
  const { data } = await api.put<ItemInventario>(`/inventario/${productoId}`, cambios);
  return data;
}