import { useCarritoStore } from '@/store/carrito';
import { encontrarPromocion, calcularSubtotalConPromocion } from '@/lib/promociones';
import type { Promocion } from '@/types';

export function useCarritoConPromociones(promociones: Promocion[] = []) {
  const items = useCarritoStore((s) => s.items);

  const itemsConPromocion = items.map((item) => {
    const promocion = encontrarPromocion(item, promociones);
    const subtotalOriginal = item.precioUnitario * item.cantidad;
    const subtotalConDescuento = calcularSubtotalConPromocion(
      item.precioUnitario,
      item.cantidad,
      promocion
    );
    return { ...item, promocion, subtotalOriginal, subtotalConDescuento };
  });

  const total = itemsConPromocion.reduce((acc, i) => acc + i.subtotalConDescuento, 0);
  const ahorroTotal = itemsConPromocion.reduce(
    (acc, i) => acc + (i.subtotalOriginal - i.subtotalConDescuento),
    0
  );

  return { itemsConPromocion, total, ahorroTotal };
}