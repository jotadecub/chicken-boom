import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConfirmarPagoDialog from '@/components/pos/ConfirmarPagoDialog';
import NuevoPedidoPendienteDialog from '@/components/pos/NuevoPedidoPendienteDialog';
import { obtenerPedidosActivos, actualizarEstadoPedido } from '@/api/pedidos';
import { obtenerMetodosPago } from '@/api/catalogo';
import { crearVenta } from '@/api/ventas';
import { Plus, Phone, MapPin } from 'lucide-react';
import type { Pedido, EstadoPedido } from '@/types';

const ESTADO_BADGE: Record<EstadoPedido, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDIENTE: { label: 'Pendiente', variant: 'outline' },
  EN_PREPARACION: { label: 'En preparación', variant: 'secondary' },
  LISTO: { label: 'Listo', variant: 'default' },
  ENTREGADO: { label: 'Entregado', variant: 'default' },
  CANCELADO: { label: 'Cancelado', variant: 'destructive' },
};

const SIGUIENTE_ESTADO: Partial<Record<EstadoPedido, EstadoPedido>> = {
  PENDIENTE: 'EN_PREPARACION',
  EN_PREPARACION: 'LISTO',
  LISTO: 'ENTREGADO',
};

export default function PedidosPendientes() {
  const [nuevoPedidoAbierto, setNuevoPedidoAbierto] = useState(false);
  const [pedidoParaCobrar, setPedidoParaCobrar] = useState<Pedido | null>(null);
  const queryClient = useQueryClient();

  const { data: todosPedidos, isLoading } = useQuery({
    queryKey: ['pedidos-activos'],
    queryFn: () => obtenerPedidosActivos(),
  });
  const { data: metodosPago } = useQuery({ queryKey: ['metodos-pago'], queryFn: obtenerMetodosPago });

  const pedidos = todosPedidos?.filter((p) => p.tipoEntrega !== 'MESA');

  function refrescar() {
    queryClient.invalidateQueries({ queryKey: ['pedidos-activos'] });
    queryClient.invalidateQueries({ queryKey: ['productos'] });
    queryClient.invalidateQueries({ queryKey: ['inventario'] });
  }

  const mutacionEstado = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoPedido }) =>
      actualizarEstadoPedido(id, estado),
    onSuccess: refrescar,
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error);
    },
  });

  const mutacionCobrar = useMutation({
    mutationFn: crearVenta,
    onSuccess: (venta) => {
      toast.success(`Cobrado: $${Number(venta.total).toLocaleString('es-CO')}`);
      setPedidoParaCobrar(null);
      refrescar();
      queryClient.invalidateQueries({ queryKey: ['resumen-ventas'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al cobrar');
    },
  });

  function totalPedido(pedido: Pedido) {
    const subtotalItems = pedido.items.reduce((s, i) => s + Number(i.subtotal), 0);
    return subtotalItems + Number(pedido.costoDomicilio ?? 0);
  }

  function handleConfirmarPago(datos: { metodoPagoId: string; nombreCliente?: string }) {
    if (!pedidoParaCobrar) return;
    mutacionCobrar.mutate({
      pedidoIds: [pedidoParaCobrar.id],
      metodoPagoId: datos.metodoPagoId,
      nombreCliente: datos.nombreCliente ?? pedidoParaCobrar.clienteNombre ?? undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pedidos Pendientes</h2>
        <Button onClick={() => setNuevoPedidoAbierto(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Nuevo pedido
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando pedidos...</p>}

      {pedidos?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay pedidos pendientes de mostrador o domicilio.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pedidos?.map((pedido) => (
          <Card key={pedido.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {pedido.tipoEntrega === 'DOMICILIO' ? '🛵 Domicilio' : '🛍️ Mostrador'}
                </Badge>
                <Badge variant={ESTADO_BADGE[pedido.estado].variant}>
                  {ESTADO_BADGE[pedido.estado].label}
                </Badge>
              </div>

              {pedido.notaCliente && (
                <p className="text-sm text-muted-foreground">📝 {pedido.notaCliente}</p>
              )}

              {pedido.tipoEntrega === 'DOMICILIO' && (
                <div className="flex flex-col gap-1 rounded-md bg-muted p-2 text-sm">
                  <p className="font-medium">{pedido.clienteNombre}</p>
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" /> {pedido.clienteTelefono}
                  </p>
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {pedido.direccionEntrega}
                  </p>
                </div>
              )}

              <ul className="space-y-1 text-sm">
                {pedido.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.cantidad}x {item.producto?.nombre ?? item.combo?.nombre}
                    </span>
                    <span>${Number(item.subtotal).toLocaleString('es-CO')}</span>
                  </li>
                ))}
                {pedido.tipoEntrega === 'DOMICILIO' && Number(pedido.costoDomicilio) > 0 && (
                  <li className="flex justify-between text-muted-foreground">
                    <span>Envío</span>
                    <span>${Number(pedido.costoDomicilio).toLocaleString('es-CO')}</span>
                  </li>
                )}
              </ul>

              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Total</span>
                <span>${totalPedido(pedido).toLocaleString('es-CO')}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {SIGUIENTE_ESTADO[pedido.estado] && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      mutacionEstado.mutate({ id: pedido.id, estado: SIGUIENTE_ESTADO[pedido.estado]! })
                    }
                  >
                    Marcar {ESTADO_BADGE[SIGUIENTE_ESTADO[pedido.estado]!].label}
                  </Button>
                )}
                <Button size="sm" onClick={() => setPedidoParaCobrar(pedido)}>
                  Cobrar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => mutacionEstado.mutate({ id: pedido.id, estado: 'CANCELADO' })}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <NuevoPedidoPendienteDialog open={nuevoPedidoAbierto} onOpenChange={setNuevoPedidoAbierto} />

      {pedidoParaCobrar && (
        <ConfirmarPagoDialog
          key={pedidoParaCobrar?.id ?? 'ninguno'}
          open={!!pedidoParaCobrar}
          onOpenChange={(open) => !open && setPedidoParaCobrar(null)}
          titulo={`Cobrar — ${pedidoParaCobrar.tipoEntrega === 'DOMICILIO' ? 'Domicilio' : 'Mostrador'}`}
          total={totalPedido(pedidoParaCobrar)}
          metodosPago={metodosPago ?? []}
          procesando={mutacionCobrar.isPending}
          onConfirmar={handleConfirmarPago}
        />
      )}
    </div>
  );
}