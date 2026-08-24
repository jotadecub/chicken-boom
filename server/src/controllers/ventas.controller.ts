import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma, TipoPromocion } from '@prisma/client';
import { prisma } from '../lib/prisma';

const itemVentaSchema = z.object({
  tipo: z.enum(['producto', 'combo']),
  id: z.string().uuid(),
  cantidad: z.number().int().positive(),
});

const crearVentaSchema = z.object({
  metodoPagoId: z.string().uuid(),
  items: z.array(itemVentaSchema).min(1, 'La venta debe tener al menos un ítem'),
});

// Busca la promoción activa (vigente hoy) que aplique a un producto o combo específico,
// ya sea de forma directa (productoId/comboId) o a través de su categoría.
async function buscarPromocionAplicable(opts: {
  productoId?: string;
  comboId?: string;
  categoriaId?: string | null;
}) {
  const ahora = new Date();

  const promocion = await prisma.promocion.findFirst({
    where: {
      activo: true,
      fechaInicio: { lte: ahora },
      fechaFin: { gte: ahora },
      OR: [
        opts.productoId ? { productoId: opts.productoId } : undefined,
        opts.comboId ? { comboId: opts.comboId } : undefined,
        opts.categoriaId ? { categoriaId: opts.categoriaId } : undefined,
      ].filter(Boolean) as Prisma.PromocionWhereInput[],
    },
    orderBy: { fechaInicio: 'desc' },
  });

  return promocion;
}

// Calcula el subtotal de una línea aplicando la promoción, si hay alguna.
function calcularSubtotal(
  precioUnitario: number,
  cantidad: number,
  promocion: { tipo: TipoPromocion; valor: Prisma.Decimal | null } | null
): number {
  if (!promocion) return precioUnitario * cantidad;

  switch (promocion.tipo) {
    case 'DOS_POR_UNO':
      // Por cada 2 unidades, se cobra 1. Ej: 5 unidades -> se cobran 3 (2 pares gratis + 1 impar).
      return Math.ceil(cantidad / 2) * precioUnitario;

    case 'PRECIO_FIJO_COMBO':
      // El valor de la promoción reemplaza el precio total del combo (no se multiplica por cantidad
      // porque un "combo" ya es una unidad completa; si piden 2 combos, se cobra 2x el precio fijo).
      return Number(promocion.valor) * cantidad;

    case 'PORCENTAJE':
      return precioUnitario * cantidad * (1 - Number(promocion.valor) / 100);

    case 'MONTO_FIJO':
      return Math.max(0, precioUnitario * cantidad - Number(promocion.valor) * cantidad);

    default:
      return precioUnitario * cantidad;
  }
}

// POST /api/ventas — requiere auth (ADMIN o VENDEDOR)
export async function crearVenta(req: Request, res: Response) {
  const parsed = crearVentaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { metodoPagoId, items } = parsed.data;

  try {
    const venta = await prisma.$transaction(async (tx) => {
      let total = 0;
      const detalles: Prisma.DetalleVentaCreateManyVentaInput[] = [];
      // Acumulamos cuánto stock descontar por producto (un combo puede repetir productos
      // entre varias líneas, así que sumamos todo antes de aplicar el descuento).
      const descuentosStock = new Map<string, number>();

      for (const item of items) {
        if (item.tipo === 'producto') {
          const producto = await tx.producto.findUnique({
            where: { id: item.id },
            include: { inventario: true },
          });

          if (!producto || !producto.activo) {
            throw new Error(`Producto ${item.id} no existe o está inactivo`);
          }
          if (!producto.inventario || producto.inventario.stockActual < item.cantidad) {
            throw new Error(`Stock insuficiente para "${producto.nombre}"`);
          }

          const promocion = await buscarPromocionAplicable({
            productoId: producto.id,
            categoriaId: producto.categoriaId,
          });

          const precioUnitario = Number(producto.precio);
          const subtotal = calcularSubtotal(precioUnitario, item.cantidad, promocion);

          detalles.push({
            productoId: producto.id,
            promocionId: promocion?.id ?? null,
            cantidad: item.cantidad,
            precioUnitario,
            subtotal,
          });

          descuentosStock.set(
            producto.id,
            (descuentosStock.get(producto.id) ?? 0) + item.cantidad
          );
          total += subtotal;
        } else {
          const combo = await tx.combo.findUnique({
            where: { id: item.id },
            include: { items: { include: { producto: { include: { inventario: true } } } } },
          });

          if (!combo || !combo.activo) {
            throw new Error(`Combo ${item.id} no existe o está inactivo`);
          }

          // Verificamos stock suficiente de CADA producto que compone el combo.
          for (const comboItem of combo.items) {
            const necesario = comboItem.cantidad * item.cantidad;
            const disponible = comboItem.producto.inventario?.stockActual ?? 0;
            if (disponible < necesario) {
              throw new Error(
                `Stock insuficiente de "${comboItem.producto.nombre}" para armar el combo "${combo.nombre}"`
              );
            }
          }

          const promocion = await buscarPromocionAplicable({ comboId: combo.id });

          const precioUnitario = Number(combo.precioCombo);
          const subtotal = calcularSubtotal(precioUnitario, item.cantidad, promocion);

          detalles.push({
            comboId: combo.id,
            promocionId: promocion?.id ?? null,
            cantidad: item.cantidad,
            precioUnitario,
            subtotal,
          });

          for (const comboItem of combo.items) {
            const necesario = comboItem.cantidad * item.cantidad;
            descuentosStock.set(
              comboItem.productoId,
              (descuentosStock.get(comboItem.productoId) ?? 0) + necesario
            );
          }
          total += subtotal;
        }
      }

      // Creamos la venta y su detalle
      const nuevaVenta = await tx.venta.create({
        data: {
          total,
          usuarioId: req.usuario!.id,
          metodoPagoId,
          detalles: { createMany: { data: detalles } },
        },
        include: {
          detalles: { include: { producto: true, combo: true, promocion: true } },
          metodoPago: true,
          usuario: { select: { id: true, nombre: true } },
        },
      });

      // Descontamos el inventario acumulado
      for (const [productoId, cantidad] of descuentosStock) {
        await tx.inventario.update({
          where: { productoId },
          data: { stockActual: { decrement: cantidad } },
        });
      }

      return nuevaVenta;
    });

    return res.status(201).json(venta);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error al procesar la venta';
    return res.status(400).json({ error: mensaje });
  }
}

// GET /api/ventas — historial, requiere auth
export async function listarVentas(req: Request, res: Response) {
  const ventas = await prisma.venta.findMany({
    include: {
      detalles: { include: { producto: true, combo: true, promocion: true } },
      metodoPago: true,
      usuario: { select: { id: true, nombre: true } },
    },
    orderBy: { fecha: 'desc' },
  });
  return res.json(ventas);
}

// GET /api/ventas/resumen — total vendido hoy (para el contador del POS)
export async function resumenVentasHoy(req: Request, res: Response) {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const ventasHoy = await prisma.venta.findMany({
    where: { fecha: { gte: inicioDia } },
    select: { total: true },
  });

  const totalHoy = ventasHoy.reduce((acc, v) => acc + Number(v.total), 0);

  return res.json({
    fecha: inicioDia.toISOString().split('T')[0],
    totalVentas: ventasHoy.length,
    totalRecaudado: totalHoy,
  });
}