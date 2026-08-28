import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Venta } from '@/types';

interface Props {
  venta: Venta | null;
  onOpenChange: (open: boolean) => void;
}

export default function DetalleVentaDialog({ venta, onOpenChange }: Props) {
  if (!venta) return null;

  return (
    <Dialog open={!!venta} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[30vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Venta — {new Date(venta.fecha).toLocaleString('es-CO')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cliente</span>
            <span>{venta.nombreCliente || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vendedor</span>
            <span>{venta.usuario.nombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Método de pago</span>
            <span>{venta.metodoPago.nombre}</span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          {venta.pedidos.map((pedido) => (
            <div key={pedido.id} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="secondary">
                  {pedido.tipoEntrega === 'MESA' ? `Mesa ${pedido.mesa?.numero}` : 'Mostrador'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(pedido.creadoEn).toLocaleTimeString('es-CO')}
                </span>
              </div>
              <ul className="space-y-1 text-sm">
                {pedido.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.cantidad}x {item.producto?.nombre ?? item.combo?.nombre}
                      {item.promocion && (
                        <span className="ml-1 text-xs text-green-600">
                          ({item.promocion.nombre})
                        </span>
                      )}
                    </span>
                    <span>${Number(item.subtotal).toLocaleString('es-CO')}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>${Number(venta.total).toLocaleString('es-CO')}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}