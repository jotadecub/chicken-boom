import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { crearPedidoInterno, liberarMesaSiNoHayPedidosActivos } from './pedidos.controller';

const crearVentaSchema = z.object({
  pedidoIds: z.array(z.string().uuid()).min(1, 'Debes indicar al menos un pedido a pagar'),
  metodoPagoId: z.string().uuid(),
  nombreCliente: z.string().min(1).optional(),
});

const ventaRapidaSchema = z.object({
  items: z
    .array(
      z.object({
        tipo: z.enum(['producto', 'combo']),
        id: z.string().uuid(),
        cantidad: z.number().int().positive(),
      })
    )
    .min(1),
  metodoPagoId: z.string().uuid(),
  nombreCliente: z.string().min(1).optional(),
});

// Lógica pura de pago, reutilizada por crearVenta y ventaRapidaMostrador
async function crearVentaInterna(datos: {
  pedidoIds: string[];
  metodoPagoId: string;
  nombreCliente?: string;
  usuarioId: string;
}) {
  const { pedidoIds, metodoPagoId, nombreCliente, usuarioId } = datos;

  return prisma.$transaction(async (tx) => {
    const pedidos = await tx.pedido.findMany({
      where: { id: { in: pedidoIds } },
      include: { items: true },
    });

    if (pedidos.length !== pedidoIds.length) {
      throw new Error('Uno o más pedidos no existen');
    }
    const yaPagado = pedidos.find((p) => p.ventaId !== null);
    if (yaPagado) {
      throw new Error(`El pedido ${yaPagado.id} ya fue pagado anteriormente`);
    }
    const cancelado = pedidos.find((p) => p.estado === 'CANCELADO');
    if (cancelado) {
      throw new Error(`El pedido ${cancelado.id} está cancelado y no se puede cobrar`);
    }

    const total = pedidos.reduce(
      (acc, p) => acc + p.items.reduce((s, i) => s + Number(i.subtotal), 0),
      0
    );

    const nuevaVenta = await tx.venta.create({
      data: { total, nombreCliente, usuarioId, metodoPagoId },
    });

    const mesasAfectadas = new Set(pedidos.filter((p) => p.mesaId).map((p) => p.mesaId as string));

    await tx.pedido.updateMany({
      where: { id: { in: pedidoIds } },
      data: { ventaId: nuevaVenta.id, estado: 'ENTREGADO' },
    });

    for (const mesaId of mesasAfectadas) {
      await liberarMesaSiNoHayPedidosActivos(tx, mesaId);
    }

    return tx.venta.findUnique({
      where: { id: nuevaVenta.id },
      include: {
        pedidos: {
          include: { items: { include: { producto: true, combo: true, promocion: true } }, mesa: true },
        },
        metodoPago: true,
        usuario: { select: { id: true, nombre: true } },
      },
    });
  });
}

// POST /api/ventas — cierra (paga) uno o varios pedidos ya existentes
export async function crearVenta(req: Request, res: Response) {
  const parsed = crearVentaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  try {
    const venta = await crearVentaInterna({ ...parsed.data, usuarioId: req.usuario!.id });
    return res.status(201).json(venta);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error al procesar la venta';
    return res.status(400).json({ error: mensaje });
  }
}

// POST /api/ventas/rapida — atajo para mostrador: crea el pedido y lo paga en un solo paso
export async function ventaRapidaMostrador(req: Request, res: Response) {
  const parsed = ventaRapidaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { items, metodoPagoId, nombreCliente } = parsed.data;
  const usuarioId = req.usuario!.id;

  try {
    const pedido = await crearPedidoInterno({ tipoEntrega: 'MOSTRADOR', items, usuarioId });
    const venta = await crearVentaInterna({
      pedidoIds: [pedido.id],
      metodoPagoId,
      nombreCliente,
      usuarioId,
    });
    return res.status(201).json(venta);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error al procesar la venta rápida';
    return res.status(400).json({ error: mensaje });
  }
}

// GET /api/ventas — historial de ventas/facturas
export async function listarVentas(req: Request, res: Response) {
  const ventas = await prisma.venta.findMany({
    include: {
      pedidos: {
        include: { items: { include: { producto: true, combo: true, promocion: true } }, mesa: true },
      },
      metodoPago: true,
      usuario: { select: { id: true, nombre: true } },
    },
    orderBy: { fecha: 'desc' },
  });
  return res.json(ventas);
}

// GET /api/ventas/resumen — total vendido hoy
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