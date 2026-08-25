import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { obtenerProductos } from '@/api/catalogo';
import { obtenerCategorias, crearCategoria } from '@/api/categorias';
import { crearProducto, actualizarProducto, desactivarProducto } from '@/api/productos';
import type { Producto } from '@/types';

interface FormState {
  nombre: string;
  descripcion: string;
  precio: string;
  imagenUrl: string;
  categoriaId: string;
  stockInicial: string;
  stockMinimo: string;
}

const FORM_VACIO: FormState = {
  nombre: '',
  descripcion: '',
  precio: '',
  imagenUrl: '',
  categoriaId: '',
  stockInicial: '',
  stockMinimo: '',
};

export default function Productos() {
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const queryClient = useQueryClient();

  const { data: productos, isLoading } = useQuery({ queryKey: ['productos'], queryFn: obtenerProductos });
  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: obtenerCategorias });

  const mutacionCrearCategoria = useMutation({
    mutationFn: crearCategoria,
    onSuccess: (categoria) => {
      toast.success('Categoría creada');
      setNuevaCategoria('');
      setForm((f) => ({ ...f, categoriaId: categoria.id }));
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al crear categoría');
    },
  });

  const mutacionGuardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        precio: Number(form.precio),
        imagenUrl: form.imagenUrl || undefined,
        categoriaId: form.categoriaId || undefined,
      };

      if (productoEditando) {
        return actualizarProducto(productoEditando.id, payload);
      }
      return crearProducto({
        ...payload,
        stockInicial: form.stockInicial ? Number(form.stockInicial) : 0,
        stockMinimo: form.stockMinimo ? Number(form.stockMinimo) : 5,
      });
    },
    onSuccess: () => {
      toast.success(productoEditando ? 'Producto actualizado' : 'Producto creado');
      cerrarDialogo();
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al guardar');
    },
  });

  const mutacionDesactivar = useMutation({
    mutationFn: desactivarProducto,
    onSuccess: () => {
      toast.success('Producto desactivado');
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al desactivar');
    },
  });

  function abrirCrear() {
    setProductoEditando(null);
    setForm(FORM_VACIO);
    setDialogAbierto(true);
  }

  function abrirEditar(producto: Producto) {
    setProductoEditando(producto);
    setForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      precio: producto.precio,
      imagenUrl: producto.imagenUrl ?? '',
      categoriaId: producto.categoriaId ?? '',
      stockInicial: '',
      stockMinimo: '',
    });
    setDialogAbierto(true);
  }

  function cerrarDialogo() {
    setDialogAbierto(false);
    setProductoEditando(null);
    setForm(FORM_VACIO);
  }

  function handleGuardar() {
    if (!form.nombre.trim() || !form.precio) {
      toast.error('Nombre y precio son obligatorios');
      return;
    }
    mutacionGuardar.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Productos</h2>
        <Button onClick={abrirCrear} className="gap-1">
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando productos...</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos?.map((producto) => (
            <TableRow key={producto.id}>
              <TableCell className="font-medium">{producto.nombre}</TableCell>
              <TableCell className="text-muted-foreground">
                {producto.categoria?.nombre ?? '—'}
              </TableCell>
              <TableCell className="text-right">
                ${Number(producto.precio).toLocaleString('es-CO')}
              </TableCell>
              <TableCell className="text-right">{producto.inventario?.stockActual ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={producto.activo ? 'secondary' : 'destructive'}>
                  {producto.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => abrirEditar(producto)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {producto.activo && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => mutacionDesactivar.mutate(producto.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogAbierto} onOpenChange={(open) => !open && cerrarDialogo()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{productoEditando ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="precio">Precio</Label>
                <Input
                  id="precio"
                  type="number"
                  min={0}
                  value={form.precio}
                  onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="imagenUrl">URL de imagen</Label>
                <Input
                  id="imagenUrl"
                  value={form.imagenUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imagenUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Categoría</Label>
              <div className="flex gap-2">
                <Select
                  items={categorias?.map((c) => ({ label: c.nombre, value: c.id })) ?? []}
                  value={form.categoriaId}
                  onValueChange={(v) => setForm((f) => ({ ...f, categoriaId: v ?? '' }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="O crea una categoría nueva"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!nuevaCategoria.trim() || mutacionCrearCategoria.isPending}
                  onClick={() => mutacionCrearCategoria.mutate(nuevaCategoria.trim())}
                >
                  Agregar
                </Button>
              </div>
            </div>

            {!productoEditando && (
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="stockInicial">Stock inicial</Label>
                  <Input
                    id="stockInicial"
                    type="number"
                    min={0}
                    value={form.stockInicial}
                    onChange={(e) => setForm((f) => ({ ...f, stockInicial: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="stockMinimo">Stock mínimo</Label>
                  <Input
                    id="stockMinimo"
                    type="number"
                    min={0}
                    value={form.stockMinimo}
                    onChange={(e) => setForm((f) => ({ ...f, stockMinimo: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={mutacionGuardar.isPending}>
              {mutacionGuardar.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}