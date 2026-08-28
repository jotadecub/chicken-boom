import type { Promocion, TipoPromocion } from '@/types';

interface ItemParaPromocion {
  tipo: 'producto' | 'combo';
  id: string;
  categoriaId?: string | null;
}

export function encontrarPromocion(
  item: ItemParaPromocion,
  promociones: Promocion[]
): Promocion | undefined {
  return promociones.find((p) => {
    if (item.tipo === 'producto') {
      return p.productoId === item.id || (p.categoriaId && p.categoriaId === item.categoriaId);
    }
    return p.comboId === item.id;
  });
}

export function calcularSubtotalConPromocion(
  precioUnitario: number,
  cantidad: number,
  promocion: Promocion | undefined
): number {
  if (!promocion) return precioUnitario * cantidad;

  const valor = promocion.valor ? Number(promocion.valor) : 0;

  switch (promocion.tipo as TipoPromocion) {
    case 'DOS_POR_UNO':
      return Math.ceil(cantidad / 2) * precioUnitario;
    case 'PRECIO_FIJO_COMBO':
      return valor * cantidad;
    case 'PORCENTAJE':
      return precioUnitario * cantidad * (1 - valor / 100);
    case 'MONTO_FIJO':
      return Math.max(0, precioUnitario * cantidad - valor * cantidad);
    default:
      return precioUnitario * cantidad;
  }
}