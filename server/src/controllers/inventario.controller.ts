import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const ajusteStockSchema = z.object({
  stockActual: z.number().int().nonnegative().optional(),
  stockMinimo: z.number().int().nonnegative().optional(),
});

// GET /api/inventario — vista general de stock (para el dashboard)
export async function listarInventario(req: Request, res: Response) {
  const inventario = await prisma.inventario.findMany({
    include: { producto: true },
    orderBy: { producto: { nombre: 'asc' } },
  });
  return res.json(inventario);
}

// GET /api/inventario/alertas — productos por debajo del stock mínimo
export async function alertasStock(req: Request, res: Response) {
  const inventario = await prisma.inventario.findMany({
    include: { producto: true },
  });
  const enAlerta = inventario.filter((i) => i.stockActual <= i.stockMinimo);
  return res.json(enAlerta);
}

// PUT /api/inventario/:productoId — ajuste manual (reabastecimiento, mermas, etc)
export async function ajustarStock(req: Request, res: Response) {
  const parsed = ajusteStockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const inventario = await prisma.inventario.update({
    where: { productoId: req.params.productoId },
    data: parsed.data,
    include: { producto: true },
  });

  return res.json(inventario);
}