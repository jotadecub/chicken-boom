import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const categoriaSchema = z.object({
  nombre: z.string().min(1),
});

// GET /api/categorias — pública (para filtros en landing y selects en el admin)
export async function listarCategorias(req: Request, res: Response) {
  const categorias = await prisma.categoria.findMany({ orderBy: { nombre: 'asc' } });
  return res.json(categorias);
}

// POST /api/categorias — solo ADMIN
export async function crearCategoria(req: Request, res: Response) {
  const parsed = categoriaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const existente = await prisma.categoria.findUnique({ where: { nombre: parsed.data.nombre } });
  if (existente) {
    return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
  }

  const categoria = await prisma.categoria.create({ data: parsed.data });
  return res.status(201).json(categoria);
}

// DELETE /api/categorias/:id — solo ADMIN
export async function eliminarCategoria(req: Request, res: Response) {
  const productosAsociados = await prisma.producto.count({
    where: { categoriaId: req.params.id },
  });

  if (productosAsociados > 0) {
    return res
      .status(400)
      .json({ error: 'No se puede eliminar: hay productos usando esta categoría' });
  }

  await prisma.categoria.delete({ where: { id: req.params.id } });
  return res.json({ mensaje: 'Categoría eliminada' });
}