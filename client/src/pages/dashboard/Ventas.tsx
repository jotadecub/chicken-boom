import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ProductoCard from '@/components/pos/ProductoCard';
import CarritoPanel from '@/components/pos/CarritoPanel';
import FiltrosProductos from '@/components/pos/FiltrosProductos';
import ConfirmarPagoDialog from '@/components/pos/ConfirmarPagoDialog';
import { obtenerProductos, obtenerCombos, obtenerMetodosPago } from '@/api/catalogo';
import { obtenerCategorias } from '@/api/categorias';
import { obtenerPromocionesActivas } from '@/api/promociones';
import { ventaRapidaMostrador } from '@/api/ventas';
import { crearPedido } from '@/api/pedidos';
import { useCarritoStore } from '@/store/carrito';
import { useCarritoConPromociones } from '@/hooks/useCarritoConPromociones';

type Categoria = 'productos' | 'combos';

export default function Ventas() {
  const [categoria, setCategoria] = useState<Categoria>('productos');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [dialogPagoAbierto, setDialogPagoAbierto] = useState(false);

  const queryClient = useQueryClient();
  const { limpiar } = useCarritoStore();
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
  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: obtenerCategorias });
  const { data: metodosPago } = useQuery({ queryKey: ['metodos-pago'], queryFn: obtenerMetodosPago });
  const { data: promociones } = useQuery({
    queryKey: ['promociones-activas'],
    queryFn: obtenerPromocionesActivas,
  });

  const { itemsConPromocion, total, ahorroTotal } = useCarritoConPromociones(promociones);

  function refrescarTodo() {
    queryClient.invalidateQueries({ queryKey: ['productos'] });
    queryClient.invalidateQueries({ queryKey: ['inventario'] });
    queryClient.invalidateQueries({ queryKey: ['resumen-ventas'] });
    queryClient.invalidateQueries({ queryKey: ['pedidos-activos'] });
  }

  const mutacionVentaRapida = useMutation({
    mutationFn: ventaRapidaMostrador,
    onSuccess: (venta) => {
      toast.success(`Venta registrada: $${Number(venta.total).toLocaleString('es-CO')}`);
      limpiar();
      setDialogPagoAbierto(false);
      refrescarTodo();
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al procesar la venta');
    },
  });

  const mutacionGuardarPendiente = useMutation({
    mutationFn: crearPedido,
    onSuccess: () => {
      toast.success('Pedido guardado como pendiente — cóbralo desde "Pedidos pendientes"');
      limpiar();
      refrescarTodo();
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al guardar el pedido');
    },
  });

  function handleGuardarPendiente() {
    if (itemsConPromocion.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    mutacionGuardarPendiente.mutate({
      tipoEntrega: 'MOSTRADOR',
      items: itemsConPromocion.map((i) => ({ tipo: i.tipo, id: i.id, cantidad: i.cantidad })),
    });
  }

  function handleConfirmarPago(datos: { metodoPagoId: string; nombreCliente?: string }) {
    mutacionVentaRapida.mutate({
      items: itemsConPromocion.map((i) => ({ tipo: i.tipo, id: i.id, cantidad: i.cantidad })),
      metodoPagoId: datos.metodoPagoId,
      nombreCliente: datos.nombreCliente,
    });
  }

  const productosFiltrados = productos
    ?.filter((p) => p.activo)
    .filter((p) => !categoriaId || p.categoriaId === categoriaId)
    .filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

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

        {categoria === 'productos' && (
          <FiltrosProductos
            categorias={categorias ?? []}
            categoriaSeleccionada={categoriaId}
            onCategoriaChange={setCategoriaId}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
          />
        )}

        {cargando && <p className="text-muted-foreground">Cargando...</p>}

        <div className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          {categoria === 'productos' &&
            productosFiltrados?.map((producto) => (
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

      <div className="flex w-80 shrink-0 flex-col gap-2">
        <CarritoPanel
          onConfirmar={() => setDialogPagoAbierto(true)}
          confirmando={mutacionVentaRapida.isPending}
          promociones={promociones}
        />
        <Button
          variant="outline"
          className="w-full"
          disabled={itemsConPromocion.length === 0 || mutacionGuardarPendiente.isPending}
          onClick={handleGuardarPendiente}
        >
          {mutacionGuardarPendiente.isPending ? 'Guardando...' : 'Guardar como pendiente (cobrar después)'}
        </Button>
      </div>

      <ConfirmarPagoDialog
        key={dialogPagoAbierto ? 'abierto' : 'cerrado'}
        open={dialogPagoAbierto}
        onOpenChange={setDialogPagoAbierto}
        total={total}
        ahorroTotal={ahorroTotal}
        metodosPago={metodosPago ?? []}
        procesando={mutacionVentaRapida.isPending}
        onConfirmar={handleConfirmarPago}
      />
    </div>
  );
}