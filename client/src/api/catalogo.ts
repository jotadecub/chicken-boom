import { api } from './client';
import type { Producto, Combo, Mesa, MetodoPago } from '@/types';

export async function obtenerProductos(): Promise<Producto[]> {
  const { data } = await api.get<Producto[]>('/productos');
  return data;
}

export async function obtenerCombos(): Promise<Combo[]> {
  const { data } = await api.get<Combo[]>('/combos');
  return data;
}

export async function obtenerMesas(): Promise<Mesa[]> {
  const { data } = await api.get<Mesa[]>('/mesas');
  return data;
}

export async function obtenerMetodosPago(): Promise<MetodoPago[]> {
  const { data } = await api.get<MetodoPago[]>('/metodos-pago');
  return data;
}