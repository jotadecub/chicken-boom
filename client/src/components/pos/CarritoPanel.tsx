import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCarritoStore } from '@/store/carrito';
import { useCarritoConPromociones } from '@/hooks/useCarritoConPromociones';
import { Minus, Plus, Trash2, ShoppingCart, Tag } from 'lucide-react';
import type { Promocion } from '@/types';

interface Props {
  onConfirmar: () => void;
  confirmando?: boolean;
  promociones?: Promocion[];
}

export default function CarritoPanel({ onConfirmar, confirmando, promociones = [] }: Props) {
  const { incrementar, decrementar, quitar } = useCarritoStore();
  const { itemsConPromocion, total, ahorroTotal } = useCarritoConPromociones(promociones);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-4 w-4" />
          Pedido actual
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {itemsConPromocion.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Toca un producto para agregarlo
          </p>
        )}

        {itemsConPromocion.map((item) => (
          <div key={item.key} className="flex flex-col gap-1 rounded-md border p-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{item.nombre}</p>
                <div className="flex items-center gap-1">
                  {item.promocion ? (
                    <>
                      <span className="text-xs text-muted-foreground line-through">
                        ${item.subtotalOriginal.toLocaleString('es-CO')}
                      </span>
                      <span className="text-xs font-semibold text-green-600">
                        ${item.subtotalConDescuento.toLocaleString('es-CO')}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      ${item.precioUnitario.toLocaleString('es-CO')} c/u
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  onClick={() => decrementar(item.key)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-5 text-center text-sm">{item.cantidad}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  onClick={() => incrementar(item.key)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={() => quitar(item.key)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {item.promocion && (
              <Badge variant="secondary" className="w-fit gap-1 text-xs text-green-700">
                <Tag className="h-3 w-3" />
                {item.promocion.nombre}
              </Badge>
            )}
          </div>
        ))}
      </CardContent>

      <div className="border-t p-4">
        <Separator className="mb-3" />
        {ahorroTotal > 0 && (
          <div className="mb-1 flex items-center justify-between text-sm text-green-600">
            <span>Ahorro por promociones</span>
            <span>-${ahorroTotal.toLocaleString('es-CO')}</span>
          </div>
        )}
        <div className="mb-3 flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span>${total.toLocaleString('es-CO')}</span>
        </div>
        <Button
          className="w-full"
          size="lg"
          disabled={itemsConPromocion.length === 0 || confirmando}
          onClick={onConfirmar}
        >
          {confirmando ? 'Procesando...' : 'Confirmar pedido'}
        </Button>
      </div>
    </Card>
  );
}