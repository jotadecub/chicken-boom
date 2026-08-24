import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const crearUsuarioSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z.enum(['ADMIN', 'VENDEDOR']).default('VENDEDOR'),
});

const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  rol: z.enum(['ADMIN', 'VENDEDOR']).optional(),
});

// Selecciona los campos seguros a devolver (nunca el passwordHash)
const camposSeguros = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
} as const;

// GET /api/usuarios — solo ADMIN
export async function listarUsuarios(req: Request, res: Response) {
  const usuarios = await prisma.usuario.findMany({
    select: camposSeguros,
    orderBy: { nombre: 'asc' },
  });
  return res.json(usuarios);
}

// GET /api/usuarios/:id — solo ADMIN
export async function obtenerUsuario(req: Request, res: Response) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.params.id },
    select: camposSeguros,
  });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json(usuario);
}

// POST /api/usuarios — solo ADMIN
export async function crearUsuario(req: Request, res: Response) {
  const parsed = crearUsuarioSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { password, ...datos } = parsed.data;

  const existente = await prisma.usuario.findUnique({ where: { email: datos.email } });
  if (existente) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.create({
    data: { ...datos, passwordHash },
    select: camposSeguros,
  });

  return res.status(201).json(usuario);
}

// PUT /api/usuarios/:id — solo ADMIN
export async function actualizarUsuario(req: Request, res: Response) {
  const parsed = actualizarUsuarioSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const { password, ...datos } = parsed.data;

  const usuario = await prisma.usuario.update({
    where: { id: req.params.id },
    data: {
      ...datos,
      // Solo re-hasheamos si mandaron una password nueva
      ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
    },
    select: camposSeguros,
  });

  return res.json(usuario);
}

// DELETE /api/usuarios/:id — solo ADMIN (borrado lógico)
// No se borra físicamente porque el usuario ya podría tener ventas registradas.
export async function desactivarUsuario(req: Request, res: Response) {
  // Evita que un admin se desactive a sí mismo por accidente y se quede sin acceso
  if (req.params.id === req.usuario!.id) {
    return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
  }

  const usuario = await prisma.usuario.update({
    where: { id: req.params.id },
    data: { activo: false },
    select: camposSeguros,
  });

  return res.json({ mensaje: 'Usuario desactivado', usuario });
}