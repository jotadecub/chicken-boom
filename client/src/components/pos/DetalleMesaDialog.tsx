import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import NuevoPedidoMesaDialog from './NuevoPedidoMesaDialog';
import { obtenerPedidosActivos, actualizarEstadoPedido } from '@/api/pedidos';
import { obtenerMetodosPago } from '@/api/catalogo';
import { crearVenta } from '@/api/ventas';
import type { Mesa, EstadoPedido } from '@/types';

interface Props {
  mesa: Mesa;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export default function DetalleMesaDialog({ mesa, open, onOpenChange }: Props) {
  const [nuevoPedidoAbierto, setNuevoPedidoAbierto] = useState(false);
  const [cobrandoAbierto, setCobrandoAbierto] = useState(false);
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const queryClient = useQueryClient();

  const { data: pedidos } = useQuery({
    queryKey: ['pedidos-activos', mesa.id],
    queryFn: () => obtenerPedidosActivos(),
    select: (todos) => todos.filter((p) => p.mesaId === mesa.id),
    enabled: open,
  });

  const { data: metodosPago } = useQuery({ queryKey: ['metodos-pago'], queryFn: obtenerMetodosPago });

  const mutacionEstado = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoPedido }) =>
      actualizarEstadoPedido(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-activos'] });
      queryClient.invalidateQueries({ queryKey: ['mesas'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error);
    },
  });

  const mutacionCobrar = useMutation({
    mutationFn: crearVenta,
    onSuccess: (venta) => {
      toast.success(`Cuenta cobrada: $${Number(venta.total).toLocaleString('es-CO')}`);
      setCobrandoAbierto(false);
      setMetodoPagoId('');
      setNombreCliente('');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['mesas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-activos'] });
      queryClient.invalidateQueries({ queryKey: ['resumen-ventas'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al cobrar');
    },
  });

  const totalCuenta = (pedidos ?? []).reduce(
    (acc, p) => acc + p.items.reduce((s, i) => s + Number(i.subtotal), 0),
    0
  );

  function handleCobrar() {
    if (!metodoPagoId) {
      toast.error('Selecciona un método de pago');
      return;
    }
    mutacionCobrar.mutate({
      pedidoIds: (pedidos ?? []).map((p) => p.id),
      metodoPagoId,
      nombreCliente: nombreCliente || undefined,
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[30vh] w-[30vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mesa {mesa.numero}</DialogTitle>
          </DialogHeader>

          {(!pedidos || pedidos.length === 0) && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Esta mesa no tiene pedidos activos todavía.
            </p>
          )}

          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
            {pedidos?.map((pedido) => (
              <div key={pedido.id} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant={ESTADO_BADGE[pedido.estado].variant}>
                    {ESTADO_BADGE[pedido.estado].label}
                  </Badge>
                  <div className="flex gap-2">
                    {SIGUIENTE_ESTADO[pedido.estado] && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          mutacionEstado.mutate({
                            id: pedido.id,
                            estado: SIGUIENTE_ESTADO[pedido.estado]!,
                          })
                        }
                      >
                        Marcar {ESTADO_BADGE[SIGUIENTE_ESTADO[pedido.estado]!].label}
                      </Button>
                    )}
                    {pedido.estado !== 'ENTREGADO' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => mutacionEstado.mutate({ id: pedido.id, estado: 'CANCELADO' })}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
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

          {pedidos && pedidos.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total cuenta</span>
                <span>${totalCuenta.toLocaleString('es-CO')}</span>
              </div>
            </>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setNuevoPedidoAbierto(true)}>
              + Nuevo pedido
            </Button>
            {pedidos && pedidos.length > 0 && (
              <Button onClick={() => setCobrandoAbierto(true)}>Cobrar cuenta</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NuevoPedidoMesaDialog
        mesaId={mesa.id}
        numeroMesa={mesa.numero}
        open={nuevoPedidoAbierto}
        onOpenChange={setNuevoPedidoAbierto}
      />

      <Dialog open={cobrandoAbierto} onOpenChange={setCobrandoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobrar Mesa {mesa.numero}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Método de pago</Label>
              <Select
                items={metodosPago?.map((mp) => ({ label: mp.nombre, value: mp.id })) ?? []}
                value={metodoPagoId}
                onValueChange={(v) => setMetodoPagoId(v ?? '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un método" />
                </SelectTrigger>
                <SelectContent>
                  {metodosPago?.map((mp) => (
                    <SelectItem key={mp.id} value={mp.id}>
                      {mp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Nombre del cliente (opcional)</Label>
              <Input value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
            </div>

            <div className="flex justify-between text-lg font-bold">
              <span>Total a cobrar</span>
              <span>${totalCuenta.toLocaleString('es-CO')}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCobrandoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCobrar} disabled={mutacionCobrar.isPending}>
              {mutacionCobrar.isPending ? 'Procesando...' : 'Confirmar cobro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}