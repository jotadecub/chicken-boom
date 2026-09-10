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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductoCard from './ProductoCard';
import FiltrosProductos from './FiltrosProductos';
import { obtenerProductos, obtenerCombos } from '@/api/catalogo';
import { obtenerCategorias } from '@/api/categorias';
import { crearPedido } from '@/api/pedidos';
import { Minus, Plus, X } from 'lucide-react';

interface ItemLocal {
  tipo: 'producto' | 'combo';
  id: string;
  nombre: string;
  cantidad: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NuevoPedidoPendienteDialog({ open, onOpenChange }: Props) {
  const [tipoEntrega, setTipoEntrega] = useState<'MOSTRADOR' | 'DOMICILIO'>('MOSTRADOR');
  const [categoriaTab, setCategoriaTab] = useState<'productos' | 'combos'>('productos');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [items, setItems] = useState<ItemLocal[]>([]);
  const [notaCliente, setNotaCliente] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [costoDomicilio, setCostoDomicilio] = useState('');
  const queryClient = useQueryClient();

  const { data: productos } = useQuery({ queryKey: ['productos'], queryFn: obtenerProductos });
  const { data: combos } = useQuery({ queryKey: ['combos'], queryFn: obtenerCombos });
  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: obtenerCategorias });

  function limpiarTodo() {
    setItems([]);
    setNotaCliente('');
    setClienteNombre('');
    setClienteTelefono('');
    setDireccionEntrega('');
    setCostoDomicilio('');
    setTipoEntrega('MOSTRADOR');
    setCategoriaId(null);
    setBusqueda('');
  }

  const mutacion = useMutation({
    mutationFn: crearPedido,
    onSuccess: () => {
      toast.success('Pedido guardado como pendiente');
      limpiarTodo();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['pedidos-activos'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al crear el pedido');
    },
  });

  function agregar(tipo: 'producto' | 'combo', id: string, nombre: string) {
    setItems((prev) => {
      const existente = prev.find((i) => i.tipo === tipo && i.id === id);
      if (existente) {
        return prev.map((i) => (i === existente ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { tipo, id, nombre, cantidad: 1 }];
    });
  }

  function cambiarCantidad(tipo: string, id: string, cantidad: number) {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((i) => !(i.tipo === tipo && i.id === id)));
      return;
    }
    setItems((prev) => prev.map((i) => (i.tipo === tipo && i.id === id ? { ...i, cantidad } : i)));
  }

  function handleEnviar() {
    if (items.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    if (tipoEntrega === 'DOMICILIO' && (!clienteNombre || !clienteTelefono || !direccionEntrega || !costoDomicilio)) {
      toast.error('Completa nombre, teléfono, dirección y costo de envío');
      return;
    }

    mutacion.mutate({
      tipoEntrega,
      items: items.map((i) => ({ tipo: i.tipo, id: i.id, cantidad: i.cantidad })),
      ...(tipoEntrega === 'MOSTRADOR' && notaCliente ? { notaCliente } : {}),
      ...(tipoEntrega === 'DOMICILIO'
        ? { clienteNombre, clienteTelefono, direccionEntrega, costoDomicilio: Number(costoDomicilio) }
        : {}),
    });
  }

  const productosFiltrados = productos
    ?.filter((p) => p.activo)
    .filter((p) => !categoriaId || p.categoriaId === categoriaId)
    .filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <Dialog
      open={open}
      onOpenChange={(nuevoEstado) => {
        if (!nuevoEstado) limpiarTodo();
        onOpenChange(nuevoEstado);
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Nuevo pedido pendiente</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            variant={tipoEntrega === 'MOSTRADOR' ? 'default' : 'outline'}
            onClick={() => setTipoEntrega('MOSTRADOR')}
          >
            🛍️ Mostrador
          </Button>
          <Button
            variant={tipoEntrega === 'DOMICILIO' ? 'default' : 'outline'}
            onClick={() => setTipoEntrega('DOMICILIO')}
          >
            🛵 Domicilio
          </Button>
        </div>

        {tipoEntrega === 'MOSTRADOR' && (
          <Input
            placeholder="Nota para identificar al cliente (ej: camisa roja, gorra azul)"
            value={notaCliente}
            onChange={(e) => setNotaCliente(e.target.value)}
          />
        )}

        {tipoEntrega === 'DOMICILIO' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Nombre</Label>
              <Input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Teléfono</Label>
              <Input value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label className="text-xs">Dirección</Label>
              <Input value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Costo de envío</Label>
              <Input
                type="number"
                min={0}
                value={costoDomicilio}
                onChange={(e) => setCostoDomicilio(e.target.value)}
              />
            </div>
          </div>
        )}

        <Tabs value={categoriaTab} onValueChange={(v) => setCategoriaTab(v as 'productos' | 'combos')}>
          <TabsList>
            <TabsTrigger value="productos">Productos</TabsTrigger>
            <TabsTrigger value="combos">Combos</TabsTrigger>
          </TabsList>
        </Tabs>

        {categoriaTab === 'productos' && (
          <FiltrosProductos
            categorias={categorias ?? []}
            categoriaSeleccionada={categoriaId}
            onCategoriaChange={setCategoriaId}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
          />
        )}

        <div
          className="grid grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-5"
          style={{ maxHeight: '35vh' }}
        >
          {categoriaTab === 'productos' &&
            productosFiltrados?.map((p) => (
              <ProductoCard
                key={p.id}
                nombre={p.nombre}
                precio={Number(p.precio)}
                imagenUrl={p.imagenUrl}
                stockDisponible={p.inventario?.stockActual}
                onClick={() => agregar('producto', p.id, p.nombre)}
              />
            ))}
          {categoriaTab === 'combos' &&
            combos
              ?.filter((c) => c.activo)
              .map((c) => (
                <ProductoCard
                  key={c.id}
                  nombre={c.nombre}
                  precio={Number(c.precioCombo)}
                  imagenUrl={c.imagenUrl}
                  esCombo
                  onClick={() => agregar('combo', c.id, c.nombre)}
                />
              ))}
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-2 overflow-y-auto border-t pt-3" style={{ maxHeight: '20vh' }}>
            {items.map((item) => (
              <div key={`${item.tipo}-${item.id}`} className="flex items-center gap-2 rounded-md border p-2">
                <span className="flex-1 truncate text-sm">{item.nombre}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => cambiarCantidad(item.tipo, item.id, item.cantidad - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={item.cantidad}
                  onChange={(e) => cambiarCantidad(item.tipo, item.id, Number(e.target.value) || 1)}
                  className="h-7 w-14 text-center"
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => cambiarCantidad(item.tipo, item.id, item.cantidad + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => cambiarCantidad(item.tipo, item.id, 0)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleEnviar} disabled={mutacion.isPending}>
            {mutacion.isPending ? 'Guardando...' : 'Guardar pedido pendiente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}