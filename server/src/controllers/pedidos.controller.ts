import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { buscarPromocionAplicable, calcularSubtotal } from '../lib/promociones';

const itemPedidoSchema = z.object({
  tipo: z.enum(['producto', 'combo']),
  id: z.string().uuid(),
  cantidad: z.number().int().positive(),
});

const crearPedidoSchema = z
  .object({
    tipoEntrega: z.enum(['MESA', 'MOSTRADOR']),
    mesaId: z.string().uuid().optional(),
    items: z.array(itemPedidoSchema).min(1, 'El pedido debe tener al menos un ítem'),
  })
  .refine((data) => data.tipoEntrega !== 'MESA' || data.mesaId, {
    message: 'mesaId es requerido cuando tipoEntrega es MESA',
    path: ['mesaId'],
  });

const actualizarEstadoSchema = z.object({
  estado: z.enum(['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO']),
});

interface DatosCrearPedido {
  tipoEntrega: 'MESA' | 'MOSTRADOR';
  mesaId?: string;
  items: { tipo: 'producto' | 'combo'; id: string; cantidad: number }[];
  usuarioId: string;
}

// Lógica de negocio pura, sin req/res — así puede ser reutilizada tanto por el
// endpoint POST /api/pedidos como por la venta rápida de mostrador.
export async function crearPedidoInterno(datos: DatosCrearPedido) {
  const { tipoEntrega, mesaId, items, usuarioId } = datos;

  return prisma.$transaction(async (tx) => {
    if (mesaId) {
      const mesa = await tx.mesa.findUnique({ where: { id: mesaId } });
      if (!mesa) throw new Error('La mesa indicada no existe');
    }

    const detalles: Prisma.PedidoItemCreateManyPedidoInput[] = [];
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

        descuentosStock.set(producto.id, (descuentosStock.get(producto.id) ?? 0) + item.cantidad);
      } else {
        const combo = await tx.combo.findUnique({
          where: { id: item.id },
          include: { items: { include: { producto: { include: { inventario: true } } } } },
        });

        if (!combo || !combo.activo) {
          throw new Error(`Combo ${item.id} no existe o está inactivo`);
        }

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
      }
    }

    const nuevoPedido = await tx.pedido.create({
      data: {
        tipoEntrega,
        mesaId: mesaId ?? null,
        usuarioId,
        items: { createMany: { data: detalles } },
      },
      include: {
        items: { include: { producto: true, combo: true, promocion: true } },
        mesa: true,
      },
    });

    for (const [productoId, cantidad] of descuentosStock) {
      await tx.inventario.update({
        where: { productoId },
        data: { stockActual: { decrement: cantidad } },
      });
    }

    if (mesaId) {
      await tx.mesa.update({ where: { id: mesaId }, data: { estado: 'OCUPADA' } });
    }

    return nuevoPedido;
  });
}

// POST /api/pedidos — capa HTTP: valida el body, llama la lógica pura, maneja errores
export async function crearPedido(req: Request, res: Response) {
  const parsed = crearPedidoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  try {
    const pedido = await crearPedidoInterno({ ...parsed.data, usuarioId: req.usuario!.id });
    return res.status(201).json(pedido);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error al crear el pedido';
    return res.status(400).json({ error: mensaje });
  }
}

// GET /api/pedidos — lista de pedidos activos (aún no pagados), para la vista de cocina/POS
export async function listarPedidosActivos(req: Request, res: Response) {
  const { estado } = req.query;

  const pedidos = await prisma.pedido.findMany({
    where: {
      ventaId: null,
      ...(estado ? { estado: estado as any } : { estado: { not: 'CANCELADO' } }),
    },
    include: {
      items: { include: { producto: true, combo: true } },
      mesa: true,
      usuario: { select: { id: true, nombre: true } },
    },
    orderBy: { creadoEn: 'asc' },
  });

  return res.json(pedidos);
}

// PUT /api/pedidos/:id/estado — mover el pedido en el flujo de cocina
export async function actualizarEstadoPedido(req: Request, res: Response) {
  const parsed = actualizarEstadoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { estado } = parsed.data;

  try {
    const pedido = await prisma.$transaction(async (tx) => {
      const pedidoActual = await tx.pedido.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });

      if (!pedidoActual) throw new Error('Pedido no encontrado');
      if (pedidoActual.ventaId) throw new Error('No se puede modificar un pedido ya pagado');

      if (estado === 'CANCELADO' && pedidoActual.estado !== 'CANCELADO') {
        for (const item of pedidoActual.items) {
          if (item.productoId) {
            await tx.inventario.update({
              where: { productoId: item.productoId },
              data: { stockActual: { increment: item.cantidad } },
            });
          } else if (item.comboId) {
            const comboItems = await tx.comboItem.findMany({ where: { comboId: item.comboId } });
            for (const ci of comboItems) {
              await tx.inventario.update({
                where: { productoId: ci.productoId },
                data: { stockActual: { increment: ci.cantidad * item.cantidad } },
              });
            }
          }
        }

        if (pedidoActual.mesaId) {
          await liberarMesaSiNoHayPedidosActivos(tx, pedidoActual.mesaId, pedidoActual.id);
        }
      }

      return tx.pedido.update({
        where: { id: req.params.id },
        data: { estado },
        include: { items: { include: { producto: true, combo: true } }, mesa: true },
      });
    });

    return res.json(pedido);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error al actualizar el pedido';
    return res.status(400).json({ error: mensaje });
  }
}

export async function liberarMesaSiNoHayPedidosActivos(
  tx: Prisma.TransactionClient,
  mesaId: string,
  pedidoExcluidoId?: string
) {
  const pedidosActivos = await tx.pedido.count({
    where: {
      mesaId,
      ventaId: null,
      estado: { not: 'CANCELADO' },
      ...(pedidoExcluidoId ? { id: { not: pedidoExcluidoId } } : {}),
    },
  });

  if (pedidosActivos === 0) {
    await tx.mesa.update({ where: { id: mesaId }, data: { estado: 'LIBRE' } });
  }
}