import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const mesaSchema = z.object({
  numero: z.number().int().positive(),
});

// GET /api/mesas — requiere auth (ADMIN o VENDEDOR), vista general para el POS
export async function listarMesas(req: Request, res: Response) {
  const mesas = await prisma.mesa.findMany({
    orderBy: { numero: 'asc' },
    include: {
      pedidos: {
        where: { estado: { not: 'ENTREGADO' }, ventaId: null },
        select: { id: true, estado: true, creadoEn: true },
      },
    },
  });
  return res.json(mesas);
}

// POST /api/mesas — solo ADMIN
export async function crearMesa(req: Request, res: Response) {
  const parsed = mesaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const existente = await prisma.mesa.findUnique({ where: { numero: parsed.data.numero } });
  if (existente) {
    return res.status(409).json({ error: `Ya existe la mesa número ${parsed.data.numero}` });
  }

  const mesa = await prisma.mesa.create({ data: parsed.data });
  return res.status(201).json(mesa);
}

// PUT /api/mesas/:id — solo ADMIN (ej: renumerar una mesa)
export async function actualizarMesa(req: Request, res: Response) {
  const parsed = mesaSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const mesa = await prisma.mesa.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  return res.json(mesa);
}

// DELETE /api/mesas/:id — solo ADMIN
export async function eliminarMesa(req: Request, res: Response) {
  const mesa = await prisma.mesa.findUnique({
    where: { id: req.params.id },
    include: { pedidos: { where: { ventaId: null } } },
  });

  if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' });

  if (mesa.pedidos.length > 0) {
    return res
      .status(400)
      .json({ error: 'No se puede eliminar una mesa con pedidos pendientes de pago' });
  }

  // Aquí sí borramos físicamente (a diferencia de productos/combos): una mesa no tiene
  // historial propio que preservar, es solo un identificador físico del local.
  await prisma.mesa.delete({ where: { id: req.params.id } });
  return res.json({ mensaje: 'Mesa eliminada' });
}