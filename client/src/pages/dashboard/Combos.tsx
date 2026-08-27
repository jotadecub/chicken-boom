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
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { obtenerProductos, obtenerCombos } from '@/api/catalogo';
import { crearCombo, actualizarCombo, desactivarCombo, type ItemComboInput } from '@/api/combos';
import type { Combo } from '@/types';
import SelectorImagen from '@/components/pos/SelectorImagen';
import { urlImagen } from '@/lib/config';

interface FormState {
  nombre: string;
  descripcion: string;
  precioCombo: string;
  imagenUrl: string;
  items: ItemComboInput[];
}

const FORM_VACIO: FormState = {
  nombre: '',
  descripcion: '',
  precioCombo: '',
  imagenUrl: '',
  items: [],
};

export default function Combos() {
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [comboEditando, setComboEditando] = useState<Combo | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [productoParaAgregar, setProductoParaAgregar] = useState('');
  const queryClient = useQueryClient();

  const { data: combos, isLoading } = useQuery({ queryKey: ['combos'], queryFn: obtenerCombos });
  const { data: productos } = useQuery({ queryKey: ['productos'], queryFn: obtenerProductos });

  const mutacionGuardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        precioCombo: Number(form.precioCombo),
        imagenUrl: form.imagenUrl || undefined,
        items: form.items,
      };
      if (comboEditando) return actualizarCombo(comboEditando.id, payload);
      return crearCombo(payload);
    },
    onSuccess: () => {
      toast.success(comboEditando ? 'Combo actualizado' : 'Combo creado');
      cerrarDialogo();
      queryClient.invalidateQueries({ queryKey: ['combos'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al guardar');
    },
  });

  const mutacionDesactivar = useMutation({
    mutationFn: desactivarCombo,
    onSuccess: () => {
      toast.success('Combo desactivado');
      queryClient.invalidateQueries({ queryKey: ['combos'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al desactivar');
    },
  });

  function abrirCrear() {
    setComboEditando(null);
    setForm(FORM_VACIO);
    setDialogAbierto(true);
  }

  function abrirEditar(combo: Combo) {
    setComboEditando(combo);
    setForm({
      nombre: combo.nombre,
      descripcion: combo.descripcion ?? '',
      precioCombo: combo.precioCombo,
      imagenUrl: combo.imagenUrl ?? '',
      items: combo.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
    });
    setDialogAbierto(true);
  }

  function cerrarDialogo() {
    setDialogAbierto(false);
    setComboEditando(null);
    setForm(FORM_VACIO);
    setProductoParaAgregar('');
  }

  function agregarItem() {
    if (!productoParaAgregar) return;
    if (form.items.some((i) => i.productoId === productoParaAgregar)) {
      toast.error('Ese producto ya está en el combo');
      return;
    }
    setForm((f) => ({
      ...f,
      items: [...f.items, { productoId: productoParaAgregar, cantidad: 1 }],
    }));
    setProductoParaAgregar('');
  }

  function quitarItem(productoId: string) {
    setForm((f) => ({ ...f, items: f.items.filter((i) => i.productoId !== productoId) }));
  }

  function cambiarCantidadItem(productoId: string, cantidad: number) {
    setForm((f) => ({
      ...f,
      items: f.items.map((i) => (i.productoId === productoId ? { ...i, cantidad } : i)),
    }));
  }

  function handleGuardar() {
    if (!form.nombre.trim() || !form.precioCombo) {
      toast.error('Nombre y precio son obligatorios');
      return;
    }
    if (form.items.length === 0) {
      toast.error('El combo debe tener al menos un producto');
      return;
    }
    mutacionGuardar.mutate();
  }

  function nombreProducto(productoId: string) {
    return productos?.find((p) => p.id === productoId)?.nombre ?? '—';
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Combos</h2>
        <Button onClick={abrirCrear} className="gap-1">
          <Plus className="h-4 w-4" /> Nuevo combo
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando combos...</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Incluye</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {combos?.map((combo) => (
            <TableRow key={combo.id}>
              <TableCell>
                <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted">
                  {combo.imagenUrl ? (
                    <img
                      src={urlImagen(combo.imagenUrl)}
                      alt={combo.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs">🍗</div>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">{combo.nombre}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {combo.items.map((i) => `${i.cantidad}x ${i.producto.nombre}`).join(', ')}
              </TableCell>
              <TableCell className="text-right">
                ${Number(combo.precioCombo).toLocaleString('es-CO')}
              </TableCell>
              <TableCell>
                <Badge variant={combo.activo ? 'secondary' : 'destructive'}>
                  {combo.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => abrirEditar(combo)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {combo.activo && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => mutacionDesactivar.mutate(combo.id)}
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
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{comboEditando ? 'Editar combo' : 'Nuevo combo'}</DialogTitle>
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
                <Label htmlFor="precioCombo">Precio del combo</Label>
                <Input
                  id="precioCombo"
                  type="number"
                  min={0}
                  value={form.precioCombo}
                  onChange={(e) => setForm((f) => ({ ...f, precioCombo: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="imagenUrl">URL de imagen</Label>
                <div className="flex flex-col gap-2">
                  <Label>Imagen</Label>
                  <SelectorImagen
                    valor={form.imagenUrl}
                    onChange={(url) => setForm((f) => ({ ...f, imagenUrl: url }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <Label>Productos que incluye</Label>
              <div className="flex gap-2">
                <Select
                  items={
                    productos
                      ?.filter((p) => p.activo)
                      .map((p) => ({ label: p.nombre, value: p.id })) ?? []
                  }
                  value={productoParaAgregar}
                  onValueChange={(v) => setProductoParaAgregar(v ?? '')}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productos
                      ?.filter((p) => p.activo)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={agregarItem}>
                  Agregar
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {form.items.map((item) => (
                  <div
                    key={item.productoId}
                    className="flex items-center gap-2 rounded-md border p-2"
                  >
                    <span className="flex-1 text-sm">{nombreProducto(item.productoId)}</span>
                    <Input
                      type="number"
                      min={1}
                      className="w-16"
                      value={item.cantidad}
                      onChange={(e) =>
                        cambiarCantidadItem(item.productoId, Number(e.target.value) || 1)
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => quitarItem(item.productoId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.items.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aún no has agregado productos al combo.
                  </p>
                )}
              </div>
            </div>
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