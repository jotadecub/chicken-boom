import { api } from './client';
import type { Pedido, TipoEntrega } from '@/types';

export interface ItemPedidoInput {
  tipo: 'producto' | 'combo';
  id: string;
  cantidad: number;
}

export interface CrearPedidoInput {
  tipoEntrega: TipoEntrega;
  mesaId?: string;
  items: ItemPedidoInput[];
}

export async function crearPedido(input: CrearPedidoInput): Promise<Pedido> {
  const { data } = await api.post<Pedido>('/pedidos', input);
  return data;
}

export async function obtenerPedidosActivos(estado?: string): Promise<Pedido[]> {
  const { data } = await api.get<Pedido[]>('/pedidos', { params: { estado } });
  return data;
}

export async function actualizarEstadoPedido(id: string, estado: string): Promise<Pedido> {
  const { data } = await api.put<Pedido>(`/pedidos/${id}/estado`, { estado });
  return data;
}