import { api } from './client';
import type { Venta } from '@/types';

export interface VentaRapidaInput {
  items: { tipo: 'producto' | 'combo'; id: string; cantidad: number }[];
  metodoPagoId: string;
  nombreCliente?: string;
}

export interface CrearVentaInput {
  pedidoIds: string[];
  metodoPagoId: string;
  nombreCliente?: string;
}

export interface FiltroVentas {
  fechaInicio?: string;
  fechaFin?: string;
}

export async function obtenerVentas(filtro?: FiltroVentas): Promise<Venta[]> {
  const { data } = await api.get<Venta[]>('/ventas', { params: filtro });
  return data;
}

export async function ventaRapidaMostrador(input: VentaRapidaInput): Promise<Venta> {
  const { data } = await api.post<Venta>('/ventas/rapida', input);
  return data;
}

export async function crearVenta(input: CrearVentaInput): Promise<Venta> {
  const { data } = await api.post<Venta>('/ventas', input);
  return data;
}

export async function obtenerResumenVentasHoy(): Promise<{
  totalVentas: number;
  totalRecaudado: number;
}> {
  const { data } = await api.get('/ventas/resumen');
  return data;
}