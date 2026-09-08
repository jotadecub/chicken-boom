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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductoCard from './ProductoCard';
import { obtenerProductos, obtenerCombos } from '@/api/catalogo';
import { crearPedido } from '@/api/pedidos';
import FiltrosProductos from '@/components/pos/FiltrosProductos';
import { obtenerCategorias } from '@/api/categorias';
import { Input } from '@/components/ui/input';
import { Minus, Plus, X } from 'lucide-react';

interface ItemLocal {
  tipo: 'producto' | 'combo';
  id: string;
  nombre: string;
  cantidad: number;
}

interface Props {
  mesaId: string;
  numeroMesa: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NuevoPedidoMesaDialog({ mesaId, numeroMesa, open, onOpenChange }: Props) {
  const [categoria, setCategoria] = useState<'productos' | 'combos'>('productos');
  const [items, setItems] = useState<ItemLocal[]>([]);
  const queryClient = useQueryClient();
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: obtenerCategorias });
  const { data: productos } = useQuery({ queryKey: ['productos'], queryFn: obtenerProductos });
  const { data: combos } = useQuery({ queryKey: ['combos'], queryFn: obtenerCombos });

  const productosFiltrados = productos
    ?.filter((p) => p.activo)
    .filter((p) => !categoriaId || p.categoriaId === categoriaId)
    .filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

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
      quitar(tipo, id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.tipo === tipo && i.id === id ? { ...i, cantidad } : i))
    );
  }

  function quitar(tipo: string, id: string) {
    setItems((prev) => prev.filter((i) => !(i.tipo === tipo && i.id === id)));
  }

  const mutacion = useMutation({
    mutationFn: crearPedido,
    onSuccess: () => {
      toast.success(`Pedido enviado a cocina — Mesa ${numeroMesa}`);
      setItems([]);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['mesas'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-activos'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error ?? 'Error al crear el pedido');
      } else {
        toast.error('Error inesperado al crear el pedido');
      }
    },
  });

  function handleEnviar() {
    if (items.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    mutacion.mutate({
      tipoEntrega: 'MESA',
      mesaId,
      items: items.map((i) => ({ tipo: i.tipo, id: i.id, cantidad: i.cantidad })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[80vw] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Nuevo pedido — Mesa {numeroMesa}</DialogTitle>
        </DialogHeader>

        <Tabs value={categoria} onValueChange={(v) => setCategoria(v as 'productos' | 'combos')}>
          <TabsList>
            <TabsTrigger value="productos">Productos</TabsTrigger>
            <TabsTrigger value="combos">Combos</TabsTrigger>
          </TabsList>
        </Tabs>

        {categoria === 'productos' && (
          <FiltrosProductos
            categorias={categorias ?? []}
            categoriaSeleccionada={categoriaId}
            onCategoriaChange={setCategoriaId}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
          />
        )}

        <div className="grid grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-5" style={{ maxHeight: '60vh' }}>
          {categoria === 'productos' &&
            productosFiltrados
              ?.filter((p) => p.activo)
              .map((p) => (
                <ProductoCard
                  key={p.id}
                  nombre={p.nombre}
                  precio={Number(p.precio)}
                  imagenUrl={p.imagenUrl}
                  stockDisponible={p.inventario?.stockActual}
                  onClick={() => agregar('producto', p.id, p.nombre)}
                />
              ))}
          {categoria === 'combos' &&
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
          <div className="flex flex-col gap-2 border-t pt-3">
            <p className="text-sm font-medium">Productos en este pedido</p>
            {items.map((item) => (
              <div
                key={`${item.tipo}-${item.id}`}
                className="flex items-center gap-2 rounded-md border p-2"
              >
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
                  onClick={() => quitar(item.tipo, item.id)}
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
            {mutacion.isPending ? 'Enviando...' : 'Enviar a cocina'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}