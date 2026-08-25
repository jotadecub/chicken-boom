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
import { Badge } from '@/components/ui/badge';
import ProductoCard from './ProductoCard';
import { obtenerProductos, obtenerCombos } from '@/api/catalogo';
import { crearPedido } from '@/api/pedidos';

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

  const { data: productos } = useQuery({ queryKey: ['productos'], queryFn: obtenerProductos });
  const { data: combos } = useQuery({ queryKey: ['combos'], queryFn: obtenerCombos });

  function agregar(tipo: 'producto' | 'combo', id: string, nombre: string) {
    setItems((prev) => {
      const existente = prev.find((i) => i.tipo === tipo && i.id === id);
      if (existente) {
        return prev.map((i) => (i === existente ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { tipo, id, nombre, cantidad: 1 }];
    });
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuevo pedido — Mesa {numeroMesa}</DialogTitle>
        </DialogHeader>

        <Tabs value={categoria} onValueChange={(v) => setCategoria(v as 'productos' | 'combos')}>
          <TabsList>
            <TabsTrigger value="productos">Productos</TabsTrigger>
            <TabsTrigger value="combos">Combos</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {categoria === 'productos' &&
            productos
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
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {items.map((i) => (
              <Badge
                key={`${i.tipo}-${i.id}`}
                variant="secondary"
                className="cursor-pointer gap-1"
                onClick={() => quitar(i.tipo, i.id)}
              >
                {i.cantidad}x {i.nombre} ✕
              </Badge>
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