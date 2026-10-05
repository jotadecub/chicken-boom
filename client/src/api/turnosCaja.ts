import { api } from './client';

export interface ResumenTurno {
  totalVentas: number;
  totalGeneral: number;
  totalEfectivo: number;
  porMetodoPago: { nombre: string; total: number; cantidad: number }[];
}

export interface TurnoCaja {
  id: string;
  usuarioId: string;
  fechaApertura: string;
  fechaCierre?: string | null;
  montoInicial: string;
  montoContado?: string | null;
  observaciones?: string | null;
  usuario: { id: string; nombre: string };
  resumen: ResumenTurno;
  efectivoEsperado?: number;
  diferencia?: number;
}

export async function obtenerTurnoActivo(): Promise<TurnoCaja | null> {
  const { data } = await api.get<TurnoCaja | null>('/turnos-caja/activo');
  return data;
}

export async function abrirTurno(montoInicial: number): Promise<TurnoCaja> {
  const { data } = await api.post<TurnoCaja>('/turnos-caja/abrir', { montoInicial });
  return data;
}

export async function cerrarTurno(
  id: string,
  montoContado: number,
  observaciones?: string
): Promise<TurnoCaja> {
  const { data } = await api.post<TurnoCaja>(`/turnos-caja/${id}/cerrar`, {
    montoContado,
    observaciones,
  });
  return data;
}

export async function listarTurnos(): Promise<TurnoCaja[]> {
  const { data } = await api.get<TurnoCaja[]>('/turnos-caja');
  return data;
}