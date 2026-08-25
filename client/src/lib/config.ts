// VITE_API_URL ya incluye "/api" al final, lo quitamos para armar URLs de archivos estáticos
export const SERVER_URL = import.meta.env.VITE_API_URL.replace(/\/api$/, '');

export function urlImagen(rutaRelativa?: string | null): string | undefined {
  if (!rutaRelativa) return undefined;
  if (rutaRelativa.startsWith('http')) return rutaRelativa; // ya es una URL externa
  return `${SERVER_URL}${rutaRelativa}`;
}