import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const metodoPagoSchema = z.object({
  nombre: z.string().min(1),
});

// GET /api/metodos-pago — lista pública (para el selector en el POS)
export async function listarMetodosPago(req: Request, res: Response) {
  const metodos = await prisma.metodoPago.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
  });
  return res.json(metodos);
}

// GET /api/metodos-pago/todos — ADMIN, incluye inactivos (para gestión)
export async function listarTodosLosMetodosPago(req: Request, res: Response) {
  const metodos = await prisma.metodoPago.findMany({
    orderBy: { nombre: 'asc' },
  });
  return res.json(metodos);
}

// POST /api/metodos-pago — solo ADMIN
export async function crearMetodoPago(req: Request, res: Response) {
  const parsed = metodoPagoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const existente = await prisma.metodoPago.findUnique({ where: { nombre: parsed.data.nombre } });
  if (existente) {
    return res.status(409).json({ error: 'Ya existe un método de pago con ese nombre' });
  }

  const metodo = await prisma.metodoPago.create({ data: parsed.data });
  return res.status(201).json(metodo);
}

// PUT /api/metodos-pago/:id — solo ADMIN
export async function actualizarMetodoPago(req: Request, res: Response) {
  const parsed = metodoPagoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const metodo = await prisma.metodoPago.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  return res.json(metodo);
}

// DELETE /api/metodos-pago/:id — solo ADMIN (borrado lógico)
// No lo borramos físicamente porque ya podría estar referenciado en ventas históricas.
export async function desactivarMetodoPago(req: Request, res: Response) {
  const metodo = await prisma.metodoPago.update({
    where: { id: req.params.id },
    data: { activo: false },
  });
  return res.json({ mensaje: 'Método de pago desactivado', metodo });
}