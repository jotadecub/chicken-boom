import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const abrirTurnoSchema = z.object({
  montoInicial: z.number().nonnegative(),
});

const cerrarTurnoSchema = z.object({
  montoContado: z.number().nonnegative(),
  observaciones: z.string().optional(),
});

async function calcularResumenTurno(turnoId: string) {
  const ventas = await prisma.venta.findMany({
    where: { turnoCajaId: turnoId, anulada: false },
    include: { metodoPago: true },
  });

  const porMetodoPago: Record<string, { nombre: string; total: number; cantidad: number }> = {};

  for (const venta of ventas) {
    const key = venta.metodoPagoId;
    if (!porMetodoPago[key]) {
      porMetodoPago[key] = { nombre: venta.metodoPago.nombre, total: 0, cantidad: 0 };
    }
    porMetodoPago[key].total += Number(venta.total);
    porMetodoPago[key].cantidad += 1;
  }

  const totalGeneral = ventas.reduce((acc, v) => acc + Number(v.total), 0);
  const totalEfectivo = Object.values(porMetodoPago)
    .filter((m) => m.nombre.toLowerCase().includes('efectivo'))
    .reduce((acc, m) => acc + m.total, 0);

  return {
    totalVentas: ventas.length,
    totalGeneral,
    totalEfectivo,
    porMetodoPago: Object.values(porMetodoPago),
  };
}

// GET /api/turnos-caja/activo — el turno abierto actualmente (si hay alguno)
export async function obtenerTurnoActivo(req: Request, res: Response) {
  const turno = await prisma.turnoCaja.findFirst({
    where: { fechaCierre: null },
    include: { usuario: { select: { id: true, nombre: true } } },
  });

  if (!turno) return res.json(null);

  const resumen = await calcularResumenTurno(turno.id);
  return res.json({ ...turno, resumen });
}

// POST /api/turnos-caja/abrir
export async function abrirTurno(req: Request, res: Response) {
  const parsed = abrirTurnoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const turnoAbierto = await prisma.turnoCaja.findFirst({
    where: { fechaCierre: null },
    include: { usuario: { select: { nombre: true } } },
  });

  if (turnoAbierto) {
    return res
      .status(409)
      .json({ error: `Ya hay un turno de caja abierto por ${turnoAbierto.usuario.nombre}` });
  }

  const turno = await prisma.turnoCaja.create({
    data: { usuarioId: req.usuario!.id, montoInicial: parsed.data.montoInicial },
  });

  return res.status(201).json(turno);
}

// POST /api/turnos-caja/:id/cerrar
export async function cerrarTurno(req: Request, res: Response) {
  const parsed = cerrarTurnoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }

  const turno = await prisma.turnoCaja.findUnique({ where: { id: req.params.id } });
  if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
  if (turno.fechaCierre) return res.status(400).json({ error: 'Este turno ya fue cerrado' });

  const resumen = await calcularResumenTurno(turno.id);
  const efectivoEsperado = Number(turno.montoInicial) + resumen.totalEfectivo;
  const diferencia = parsed.data.montoContado - efectivoEsperado;

  const turnoActualizado = await prisma.turnoCaja.update({
    where: { id: req.params.id },
    data: {
      fechaCierre: new Date(),
      montoContado: parsed.data.montoContado,
      observaciones: parsed.data.observaciones,
    },
  });

  return res.json({ ...turnoActualizado, resumen, efectivoEsperado, diferencia });
}

// GET /api/turnos-caja — historial de turnos cerrados
export async function listarTurnos(req: Request, res: Response) {
  const turnos = await prisma.turnoCaja.findMany({
    where: { fechaCierre: { not: null } },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { fechaApertura: 'desc' },
  });

  const turnosConResumen = await Promise.all(
    turnos.map(async (turno) => {
      const resumen = await calcularResumenTurno(turno.id);
      const efectivoEsperado = Number(turno.montoInicial) + resumen.totalEfectivo;
      const diferencia = Number(turno.montoContado) - efectivoEsperado;
      return { ...turno, resumen, efectivoEsperado, diferencia };
    })
  );

  return res.json(turnosConResumen);
}