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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Pencil } from 'lucide-react';
import { obtenerInventario, ajustarStock, type ItemInventario } from '@/api/inventario';
import { useAuthStore } from '@/store/auth';

export default function Inventario() {
  const [itemEditando, setItemEditando] = useState<ItemInventario | null>(null);
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevoMinimo, setNuevoMinimo] = useState('');
  const usuario = useAuthStore((s) => s.usuario);
  const queryClient = useQueryClient();

  const { data: inventario, isLoading } = useQuery({
    queryKey: ['inventario'],
    queryFn: obtenerInventario,
  });

  const mutacionAjustar = useMutation({
    mutationFn: ({ productoId, cambios }: { productoId: string; cambios: { stockActual?: number; stockMinimo?: number } }) =>
      ajustarStock(productoId, cambios),
    onSuccess: () => {
      toast.success('Inventario actualizado');
      setItemEditando(null);
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al ajustar el stock');
    },
  });

  function abrirEdicion(item: ItemInventario) {
    setItemEditando(item);
    setNuevoStock(String(item.stockActual));
    setNuevoMinimo(String(item.stockMinimo));
  }

  function guardarCambios() {
    if (!itemEditando) return;
    mutacionAjustar.mutate({
      productoId: itemEditando.producto.id,
      cambios: {
        stockActual: parseInt(nuevoStock, 10),
        stockMinimo: parseInt(nuevoMinimo, 10),
      },
    });
  }

  const totalAlertas = inventario?.filter((i) => i.stockActual <= i.stockMinimo).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inventario</h2>
        {totalAlertas > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {totalAlertas} producto{totalAlertas > 1 ? 's' : ''} con stock bajo
          </Badge>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando inventario...</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Stock actual</TableHead>
            <TableHead className="text-right">Stock mínimo</TableHead>
            <TableHead>Estado</TableHead>
            {usuario?.rol === 'ADMIN' && <TableHead className="text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventario?.map((item) => {
            const bajo = item.stockActual <= item.stockMinimo;
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.producto.nombre}</TableCell>
                <TableCell className="text-right">{item.stockActual}</TableCell>
                <TableCell className="text-right text-muted-foreground">{item.stockMinimo}</TableCell>
                <TableCell>
                  <Badge variant={bajo ? 'destructive' : 'secondary'}>
                    {bajo ? 'Stock bajo' : 'Disponible'}
                  </Badge>
                </TableCell>
                {usuario?.rol === 'ADMIN' && (
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => abrirEdicion(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!itemEditando} onOpenChange={(open) => !open && setItemEditando(null)}>
        <DialogContent className="max-h-[90vh] w-[30vw] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajustar stock — {itemEditando?.producto.nombre}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="stockActual">Stock actual</Label>
              <Input
                id="stockActual"
                type="number"
                min={0}
                value={nuevoStock}
                onChange={(e) => setNuevoStock(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Usa esto para reabastecimiento o corrección por mermas.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stockMinimo">Stock mínimo (umbral de alerta)</Label>
              <Input
                id="stockMinimo"
                type="number"
                min={0}
                value={nuevoMinimo}
                onChange={(e) => setNuevoMinimo(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={guardarCambios} disabled={mutacionAjustar.isPending}>
              {mutacionAjustar.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}