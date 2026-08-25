import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ProductoCard from '@/components/pos/ProductoCard';
import CarritoPanel from '@/components/pos/CarritoPanel';
import { obtenerProductos, obtenerCombos, obtenerMetodosPago } from '@/api/catalogo';
import { ventaRapidaMostrador } from '@/api/ventas';
import { useCarritoStore } from '@/store/carrito';

type Categoria = 'productos' | 'combos';

export default function Ventas() {
  const [categoria, setCategoria] = useState<Categoria>('productos');
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');

  const queryClient = useQueryClient();
  const { items, limpiar } = useCarritoStore();
  const agregarProducto = useCarritoStore((s) => s.agregarProducto);
  const agregarCombo = useCarritoStore((s) => s.agregarCombo);

  const { data: productos, isLoading: cargandoProductos } = useQuery({
    queryKey: ['productos'],
    queryFn: obtenerProductos,
  });

  const { data: combos, isLoading: cargandoCombos } = useQuery({
    queryKey: ['combos'],
    queryFn: obtenerCombos,
  });

  const { data: metodosPago } = useQuery({
    queryKey: ['metodos-pago'],
    queryFn: obtenerMetodosPago,
  });

  const mutacionVenta = useMutation({
    mutationFn: ventaRapidaMostrador,
    onSuccess: (venta) => {
      toast.success(`Venta registrada: $${Number(venta.total).toLocaleString('es-CO')}`);
      limpiar();
      setDialogAbierto(false);
      setNombreCliente('');
      setMetodoPagoId('');
      // Refrescamos inventario y resumen porque la venta descontó stock
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['resumen-ventas'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error ?? 'Error al procesar la venta');
      } else {
        toast.error('Error inesperado al procesar la venta');
      }
    },
  });

  function handleConfirmarPedido() {
    setDialogAbierto(true);
  }

  function handlePagar() {
    if (!metodoPagoId) {
      toast.error('Selecciona un método de pago');
      return;
    }

    mutacionVenta.mutate({
      items: items.map((i) => ({ tipo: i.tipo, id: i.id, cantidad: i.cantidad })),
      metodoPagoId,
      nombreCliente: nombreCliente || undefined,
    });
  }

  const cargando = categoria === 'productos' ? cargandoProductos : cargandoCombos;

  return (
    <div className="flex h-full gap-6">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ventas — Mostrador</h2>
          <Tabs value={categoria} onValueChange={(v) => setCategoria(v as Categoria)}>
            <TabsList>
              <TabsTrigger value="productos">Productos</TabsTrigger>
              <TabsTrigger value="combos">Combos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {cargando && <p className="text-muted-foreground">Cargando...</p>}

        <div className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          {categoria === 'productos' &&
            productos
              ?.filter((p) => p.activo)
              .map((producto) => (
                <ProductoCard
                  key={producto.id}
                  nombre={producto.nombre}
                  precio={Number(producto.precio)}
                  imagenUrl={producto.imagenUrl}
                  stockDisponible={producto.inventario?.stockActual}
                  onClick={() => agregarProducto(producto)}
                />
              ))}

          {categoria === 'combos' &&
            combos
              ?.filter((c) => c.activo)
              .map((combo) => (
                <ProductoCard
                  key={combo.id}
                  nombre={combo.nombre}
                  precio={Number(combo.precioCombo)}
                  imagenUrl={combo.imagenUrl}
                  esCombo
                  onClick={() => agregarCombo(combo)}
                />
              ))}
        </div>
      </div>

      <div className="w-80 shrink-0">
        <CarritoPanel onConfirmar={handleConfirmarPedido} confirmando={mutacionVenta.isPending} />
      </div>

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar venta</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="metodoPago">Método de pago</Label>
              <Select
                items={metodosPago?.map((mp) => ({ label: mp.nombre, value: mp.id })) ?? []}
                value={metodoPagoId}
                onValueChange={(value) => setMetodoPagoId(value ?? '')}
              >
                <SelectTrigger id="metodoPago">
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
              <Label htmlFor="cliente">Nombre del cliente (opcional)</Label>
              <Input
                id="cliente"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Para la factura"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePagar} disabled={mutacionVenta.isPending}>
              {mutacionVenta.isPending ? 'Procesando...' : 'Confirmar y cobrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}