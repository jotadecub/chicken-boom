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
import { Plus, Trash2 } from 'lucide-react';
import { obtenerProductos, obtenerCombos } from '@/api/catalogo';
import { obtenerCategorias } from '@/api/categorias';
import {
  obtenerTodasLasPromociones,
  crearPromocion,
  desactivarPromocion,
} from '@/api/promociones';
import type { TipoPromocion } from '@/types';
import { reactivarPromocion } from '@/api/promociones';

type AplicaA = 'producto' | 'combo' | 'categoria';

const TIPOS_PROMOCION: { value: TipoPromocion; label: string; requiereValor: boolean }[] = [
  { value: 'DOS_POR_UNO', label: '2x1', requiereValor: false },
  { value: 'PRECIO_FIJO_COMBO', label: 'Precio fijo combo', requiereValor: true },
  { value: 'PORCENTAJE', label: 'Porcentaje de descuento', requiereValor: true },
  { value: 'MONTO_FIJO', label: 'Monto fijo de descuento', requiereValor: true },
];

interface FormState {
  nombre: string;
  tipo: TipoPromocion | '';
  valor: string;
  aplicaA: AplicaA;
  aplicaAId: string;
  fechaInicio: string;
  fechaFin: string;
}

const FORM_VACIO: FormState = {
  nombre: '',
  tipo: '',
  valor: '',
  aplicaA: 'producto',
  aplicaAId: '',
  fechaInicio: '',
  fechaFin: '',
};

export default function Promociones() {
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const queryClient = useQueryClient();
  const [mostrarDesactivadas, setMostrarDesactivadas] = useState(false);

  const { data: promociones, isLoading } = useQuery({
    queryKey: ['promociones-todas'],
    queryFn: obtenerTodasLasPromociones,
  });
  const { data: productos } = useQuery({ queryKey: ['productos'], queryFn: obtenerProductos });
  const { data: combos } = useQuery({ queryKey: ['combos'], queryFn: obtenerCombos });
  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: obtenerCategorias });

  const mutacionCrear = useMutation({
    mutationFn: crearPromocion,
    onSuccess: () => {
      toast.success('Promoción creada');
      cerrarDialogo();
      queryClient.invalidateQueries({ queryKey: ['promociones-todas'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        const detalles = error.response?.data?.detalles?.formErrors?.join(', ');
        toast.error(detalles || error.response?.data?.error || 'Error al crear la promoción');
      }
    },
  });

  const mutacionDesactivar = useMutation({
    mutationFn: desactivarPromocion,
    onSuccess: () => {
      toast.success('Promoción desactivada');
      queryClient.invalidateQueries({ queryKey: ['promociones-todas'] });
    },
  });

  const mutacionReactivar = useMutation({
    mutationFn: reactivarPromocion,
    onSuccess: () => {
      toast.success('Promoción reactivada');
      queryClient.invalidateQueries({ queryKey: ['promociones-todas'] });
    },
  });

  function cerrarDialogo() {
    setDialogAbierto(false);
    setForm(FORM_VACIO);
  }

  const tipoSeleccionado = TIPOS_PROMOCION.find((t) => t.value === form.tipo);
  const promocionesVisibles = promociones?.filter((p) => mostrarDesactivadas || p.activo);

  function handleGuardar() {
    if (!form.nombre.trim() || !form.tipo || !form.aplicaAId || !form.fechaInicio || !form.fechaFin) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    if (tipoSeleccionado?.requiereValor && !form.valor) {
      toast.error('Este tipo de promoción requiere un valor');
      return;
    }

    mutacionCrear.mutate({
      nombre: form.nombre,
      tipo: form.tipo,
      valor: form.valor ? Number(form.valor) : undefined,
      productoId: form.aplicaA === 'producto' ? form.aplicaAId : undefined,
      comboId: form.aplicaA === 'combo' ? form.aplicaAId : undefined,
      categoriaId: form.aplicaA === 'categoria' ? form.aplicaAId : undefined,
      fechaInicio: new Date(`${form.fechaInicio}T00:00:00`).toISOString(),
      fechaFin: new Date(`${form.fechaFin}T23:59:59`).toISOString(),
    });
  }

  function opcionesAplicaA() {
    if (form.aplicaA === 'producto') {
      return productos?.map((p) => ({ label: p.nombre, value: p.id })) ?? [];
    }
    if (form.aplicaA === 'combo') {
      return combos?.map((c) => ({ label: c.nombre, value: c.id })) ?? [];
    }
    return categorias?.map((c) => ({ label: c.nombre, value: c.id })) ?? [];
  }

  function estaVigente(promo: { fechaInicio: string; fechaFin: string; activo: boolean }) {
    const ahora = new Date();
    return promo.activo && new Date(promo.fechaInicio) <= ahora && new Date(promo.fechaFin) >= ahora;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Promociones</h2>
        <div className="flex items-center gap-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMostrarDesactivadas((v) => !v)}
          >
            {mostrarDesactivadas ? 'Ocultar desactivadas' : 'Mostrar desactivadas'}
          </Button>
          <Button onClick={() => setDialogAbierto(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Nueva promoción
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando promociones...</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Vigencia</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promocionesVisibles?.map((promo) => (
            <TableRow key={promo.id}>
              <TableCell className="font-medium">{promo.nombre}</TableCell>
              <TableCell>{TIPOS_PROMOCION.find((t) => t.value === promo.tipo)?.label}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(promo.fechaInicio).toLocaleDateString('es-CO')} —{' '}
                {new Date(promo.fechaFin).toLocaleDateString('es-CO')}
              </TableCell>
              <TableCell>
                <Badge variant={estaVigente(promo) ? 'default' : 'secondary'}>
                  {!promo.activo ? 'Desactivada' : estaVigente(promo) ? 'Vigente' : 'Fuera de fecha'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {promo.activo ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => mutacionDesactivar.mutate(promo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => mutacionReactivar.mutate(promo.id)}
                  >
                    Reactivar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogAbierto} onOpenChange={(open) => !open && cerrarDialogo()}>
        <DialogContent className="max-h-[90vh] w-[30vw] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva promoción</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Tipo de promoción</Label>
              <Select
                items={TIPOS_PROMOCION}
                value={form.tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo: (v as TipoPromocion) ?? '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PROMOCION.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tipoSeleccionado?.requiereValor && (
              <div className="flex flex-col gap-2">
                <Label>
                  Valor {form.tipo === 'PORCENTAJE' ? '(%)' : '($)'}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Aplica a</Label>
              <Select
                items={[
                  { label: 'Un producto', value: 'producto' },
                  { label: 'Un combo', value: 'combo' },
                  { label: 'Una categoría', value: 'categoria' },
                ]}
                value={form.aplicaA}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, aplicaA: (v as AplicaA) ?? 'producto', aplicaAId: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="producto">Un producto</SelectItem>
                  <SelectItem value="combo">Un combo</SelectItem>
                  <SelectItem value="categoria">Una categoría</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>
                {form.aplicaA === 'producto' && 'Producto'}
                {form.aplicaA === 'combo' && 'Combo'}
                {form.aplicaA === 'categoria' && 'Categoría'}
              </Label>
              <Select
                items={opcionesAplicaA()}
                value={form.aplicaAId}
                onValueChange={(v) => setForm((f) => ({ ...f, aplicaAId: v ?? '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  {opcionesAplicaA().map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={mutacionCrear.isPending}>
              {mutacionCrear.isPending ? 'Creando...' : 'Crear promoción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}