import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const productoSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.number().positive(),
  imagenUrl: z.string().startsWith('/uploads/productos/').optional(),
  categoriaId: z.string().uuid().optional(),
  stockInicial: z.number().int().nonnegative().default(0),
  stockMinimo: z.number().int().nonnegative().default(5),
});

// GET /api/productos — lista pública (para la landing y el POS)
export async function listarProductos(req: Request, res: Response) {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    include: { categoria: true, inventario: true },
    orderBy: { nombre: 'asc' },
  });
  return res.json(productos);
}

// GET /api/productos/:id
export async function obtenerProducto(req: Request, res: Response) {
  const producto = await prisma.producto.findUnique({
    where: { id: req.params.id },
    include: { categoria: true, inventario: true },
  });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.json(producto);
}

// POST /api/productos — solo ADMIN
export async function crearProducto(req: Request, res: Response) {
  const parsed = productoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { stockInicial, stockMinimo, ...datosProducto } = parsed.data;

  // Creamos el producto y su registro de inventario en una sola transacción,
  // para que nunca exista un producto sin fila de inventario asociada.
  const producto = await prisma.producto.create({
    data: {
      ...datosProducto,
      inventario: {
        create: {
          stockActual: stockInicial,
          stockMinimo,
        },
      },
    },
    include: { inventario: true, categoria: true },
  });

  return res.status(201).json(producto);
}

// PUT /api/productos/:id — solo ADMIN
export async function actualizarProducto(req: Request, res: Response) {
  const parsed = productoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { stockInicial, stockMinimo, ...datosProducto } = parsed.data;

  const producto = await prisma.producto.update({
    where: { id: req.params.id },
    data: datosProducto,
    include: { inventario: true, categoria: true },
  });

  return res.json(producto);
}

// DELETE /api/productos/:id — solo ADMIN (borrado lógico, no físico)
export async function desactivarProducto(req: Request, res: Response) {
  const producto = await prisma.producto.update({
    where: { id: req.params.id },
    data: { activo: false },
  });
  return res.json({ mensaje: 'Producto desactivado', producto });
}