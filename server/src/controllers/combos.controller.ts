import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const comboSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precioCombo: z.number().positive(),
  imagenUrl: z.string().url().optional(),
  items: z
    .array(
      z.object({
        productoId: z.string().uuid(),
        cantidad: z.number().int().positive().default(1),
      })
    )
    .min(1, 'El combo debe tener al menos un producto'),
});

// GET /api/combos — lista pública
export async function listarCombos(req: Request, res: Response) {
  const combos = await prisma.combo.findMany({
    where: { activo: true },
    include: { items: { include: { producto: true } } },
    orderBy: { nombre: 'asc' },
  });
  return res.json(combos);
}

// GET /api/combos/:id
export async function obtenerCombo(req: Request, res: Response) {
  const combo = await prisma.combo.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { producto: true } } },
  });
  if (!combo) return res.status(404).json({ error: 'Combo no encontrado' });
  return res.json(combo);
}

// POST /api/combos — solo ADMIN
export async function crearCombo(req: Request, res: Response) {
  const parsed = comboSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { items, ...datosCombo } = parsed.data;

  // Verificamos que todos los productos referenciados existan antes de crear el combo,
  // para no terminar con un ComboItem "huérfano" apuntando a un producto inexistente.
  const productosExistentes = await prisma.producto.findMany({
    where: { id: { in: items.map((i) => i.productoId) } },
    select: { id: true },
  });

  if (productosExistentes.length !== new Set(items.map((i) => i.productoId)).size) {
    return res.status(400).json({ error: 'Uno o más productos del combo no existen' });
  }

  const combo = await prisma.combo.create({
    data: {
      ...datosCombo,
      items: { create: items },
    },
    include: { items: { include: { producto: true } } },
  });

  return res.status(201).json(combo);
}

// PUT /api/combos/:id — solo ADMIN
export async function actualizarCombo(req: Request, res: Response) {
  const parsed = comboSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { items, ...datosCombo } = parsed.data;

  // Si vienen items nuevos, reemplazamos todos los anteriores (borrar y recrear
  // es más simple y seguro que intentar hacer un "diff" de items).
  const combo = await prisma.combo.update({
    where: { id: req.params.id },
    data: {
      ...datosCombo,
      ...(items && {
        items: {
          deleteMany: {},
          create: items,
        },
      }),
    },
    include: { items: { include: { producto: true } } },
  });

  return res.json(combo);
}

// DELETE /api/combos/:id — solo ADMIN (borrado lógico)
export async function desactivarCombo(req: Request, res: Response) {
  const combo = await prisma.combo.update({
    where: { id: req.params.id },
    data: { activo: false },
  });
  return res.json({ mensaje: 'Combo desactivado', combo });
}