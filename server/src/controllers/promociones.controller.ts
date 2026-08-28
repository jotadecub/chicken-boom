import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const promocionSchema = z
  .object({
    nombre: z.string().min(1),
    tipo: z.enum(['DOS_POR_UNO', 'PRECIO_FIJO_COMBO', 'PORCENTAJE', 'MONTO_FIJO']),
    valor: z.number().positive().optional(),
    productoId: z.string().uuid().optional(),
    comboId: z.string().uuid().optional(),
    categoriaId: z.string().uuid().optional(),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
  })
  .refine((data) => data.productoId || data.comboId || data.categoriaId, {
    message: 'La promoción debe aplicar a un producto, combo o categoría',
  })
  .refine((data) => data.fechaFin > data.fechaInicio, {
    message: 'fechaFin debe ser posterior a fechaInicio',
    path: ['fechaFin'],
  })
  .refine(
    (data) => {
      // PRECIO_FIJO_COMBO y PORCENTAJE/MONTO_FIJO requieren un valor numérico
      if (['PRECIO_FIJO_COMBO', 'PORCENTAJE', 'MONTO_FIJO'].includes(data.tipo)) {
        return data.valor !== undefined;
      }
      return true;
    },
    { message: 'Este tipo de promoción requiere un valor', path: ['valor'] }
  );

// GET /api/promociones — lista pública, solo las vigentes hoy
export async function listarPromocionesActivas(req: Request, res: Response) {
  const ahora = new Date();
  const promociones = await prisma.promocion.findMany({
    where: {
      activo: true,
      fechaInicio: { lte: ahora },
      fechaFin: { gte: ahora },
    },
    orderBy: { fechaInicio: 'desc' },
  });
  return res.json(promociones);
}

// GET /api/promociones/todas — ADMIN, incluye vencidas/futuras (para gestión)
export async function listarTodasLasPromociones(req: Request, res: Response) {
  const promociones = await prisma.promocion.findMany({
    orderBy: { fechaInicio: 'desc' },
  });
  return res.json(promociones);
}

// POST /api/promociones — solo ADMIN
export async function crearPromocion(req: Request, res: Response) {
  const parsed = promocionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const promocion = await prisma.promocion.create({ data: parsed.data });
  return res.status(201).json(promocion);
}

// PUT /api/promociones/:id — solo ADMIN
export async function actualizarPromocion(req: Request, res: Response) {
  const promocion = await prisma.promocion.update({
    where: { id: req.params.id },
    data: req.body,
  });
  return res.json(promocion);
}

// PUT /api/promociones/:id/reactivar — solo ADMIN
export async function reactivarPromocion(req: Request, res: Response) {
  const promocion = await prisma.promocion.update({
    where: { id: req.params.id },
    data: { activo: true },
  });
  return res.json(promocion);
}

// DELETE /api/promociones/:id — solo ADMIN (desactivar)
export async function desactivarPromocion(req: Request, res: Response) {
  const promocion = await prisma.promocion.update({
    where: { id: req.params.id },
    data: { activo: false },
  });
  return res.json({ mensaje: 'Promoción desactivada', promocion });
}