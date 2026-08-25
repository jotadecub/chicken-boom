import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCarritoStore } from '@/store/carrito';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

interface Props {
  onConfirmar: () => void;
  confirmando?: boolean;
}

export default function CarritoPanel({ onConfirmar, confirmando }: Props) {
  const { items, incrementar, decrementar, quitar, total } = useCarritoStore();

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-4 w-4" />
          Pedido actual
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Toca un producto para agregarlo
          </p>
        )}

        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2 rounded-md border p-2">
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{item.nombre}</p>
              <p className="text-xs text-muted-foreground">
                ${item.precioUnitario.toLocaleString('es-CO')} c/u
              </p>
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
        ))}
      </CardContent>

      <div className="border-t p-4">
        <Separator className="mb-3" />
        <div className="mb-3 flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span>${total().toLocaleString('es-CO')}</span>
        </div>
        <Button
          className="w-full"
          size="lg"
          disabled={items.length === 0 || confirmando}
          onClick={onConfirmar}
        >
          {confirmando ? 'Procesando...' : 'Confirmar pedido'}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          El total final puede variar por promociones aplicadas
        </p>
      </div>
    </Card>
  );
}