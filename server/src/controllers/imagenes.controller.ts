import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

const CARPETA_UPLOADS = path.join(__dirname, '../../uploads/productos');

// POST /api/imagenes/upload — sube una imagen, devuelve su URL pública
export async function subirImagen(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  const url = `/uploads/productos/${req.file.filename}`;
  return res.status(201).json({ url, nombre: req.file.filename });
}

// GET /api/imagenes — lista todas las imágenes ya subidas (para la galería)
export async function listarImagenes(req: Request, res: Response) {
  const archivos = await fs.readdir(CARPETA_UPLOADS);
  const imagenes = archivos
    .filter((nombre) => nombre !== '.gitkeep')
    .map((nombre) => ({ nombre, url: `/uploads/productos/${nombre}` }));

  return res.json(imagenes);
}

// DELETE /api/imagenes/:nombre — elimina una imagen del servidor
export async function eliminarImagen(req: Request, res: Response) {
  const rutaArchivo = path.join(CARPETA_UPLOADS, req.params.nombre);

  // Evita que alguien intente borrar archivos fuera de la carpeta de uploads
  // usando "../" en el nombre (path traversal).
  if (!rutaArchivo.startsWith(CARPETA_UPLOADS)) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }

  try {
    await fs.unlink(rutaArchivo);
    return res.json({ mensaje: 'Imagen eliminada' });
  } catch {
    return res.status(404).json({ error: 'Imagen no encontrada' });
  }
}