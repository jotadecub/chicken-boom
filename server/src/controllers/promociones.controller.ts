import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const promocionBaseSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['DOS_POR_UNO', 'PRECIO_FIJO_COMBO', 'PORCENTAJE', 'MONTO_FIJO']),
  valor: z.number().positive().optional(),
  productoId: z.string().uuid().nullable().optional(),
  comboId: z.string().uuid().nullable().optional(),
  categoriaId: z.string().uuid().nullable().optional(),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
});

const promocionSchema = promocionBaseSchema
  .refine((data) => data.productoId || data.comboId || data.categoriaId, {
    message: 'La promoción debe aplicar a un producto, combo o categoría',
  })
  .refine((data) => data.fechaFin > data.fechaInicio, {
    message: 'fechaFin debe ser posterior a fechaInicio',
    path: ['fechaFin'],
  })
  .refine(
    (data) => {
      if (['PRECIO_FIJO_COMBO', 'PORCENTAJE', 'MONTO_FIJO'].includes(data.tipo)) {
        return data.valor !== undefined;
      }
      return true;
    },
    { message: 'Este tipo de promoción requiere un valor', path: ['valor'] }
  );

const actualizarPromocionSchema = promocionBaseSchema.partial();

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
  const parsed = actualizarPromocionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const datos = parsed.data;

  if (datos.fechaInicio && datos.fechaFin && datos.fechaFin <= datos.fechaInicio) {
    return res.status(400).json({ error: 'fechaFin debe ser posterior a fechaInicio' });
  }

  // Si se cambia el tipo hacia uno que requiere valor, exigimos que también venga el valor
  const tiposConValor = ['PRECIO_FIJO_COMBO', 'PORCENTAJE', 'MONTO_FIJO'];
  if (datos.tipo && tiposConValor.includes(datos.tipo) && datos.valor === undefined) {
    const actual = await prisma.promocion.findUnique({ where: { id: req.params.id } });
    if (!actual?.valor) {
      return res.status(400).json({ error: 'Este tipo de promoción requiere un valor' });
    }
  }

  const promocion = await prisma.promocion.update({
    where: { id: req.params.id },
    data: datos,
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