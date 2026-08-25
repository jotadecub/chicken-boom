import { api } from './client';

export interface ImagenSubida {
  url: string;
  nombre: string;
}

export async function subirImagen(archivo: File): Promise<ImagenSubida> {
  const formData = new FormData();
  formData.append('imagen', archivo);

  const { data } = await api.post<ImagenSubida>('/imagenes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listarImagenes(): Promise<ImagenSubida[]> {
  const { data } = await api.get<ImagenSubida[]>('/imagenes');
  return data;
}

export async function eliminarImagen(nombre: string): Promise<void> {
  await api.delete(`/imagenes/${nombre}`);
}