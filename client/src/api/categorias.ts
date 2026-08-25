import { api } from './client';
import type { Categoria } from '@/types';

export async function obtenerCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<Categoria[]>('/categorias');
  return data;
}

export async function crearCategoria(nombre: string): Promise<Categoria> {
  const { data } = await api.post<Categoria>('/categorias', { nombre });
  return data;
}