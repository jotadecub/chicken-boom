import { Prisma, TipoPromocion } from '@prisma/client';
import { prisma } from './prisma';

// Busca la promoción activa (vigente hoy) que aplique a un producto o combo específico,
// ya sea de forma directa (productoId/comboId) o a través de su categoría.
export async function buscarPromocionAplicable(opts: {
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
export function calcularSubtotal(
  precioUnitario: number,
  cantidad: number,
  promocion: { tipo: TipoPromocion; valor: Prisma.Decimal | null } | null
): number {
  if (!promocion) return precioUnitario * cantidad;

  switch (promocion.tipo) {
    case 'DOS_POR_UNO':
      return Math.ceil(cantidad / 2) * precioUnitario;

    case 'PRECIO_FIJO_COMBO':
      return Number(promocion.valor) * cantidad;

    case 'PORCENTAJE':
      return precioUnitario * cantidad * (1 - Number(promocion.valor) / 100);

    case 'MONTO_FIJO':
      return Math.max(0, precioUnitario * cantidad - Number(promocion.valor) * cantidad);

    default:
      return precioUnitario * cantidad;
  }
}