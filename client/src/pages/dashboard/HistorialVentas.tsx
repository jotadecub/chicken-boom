import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Card, CardContent } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { obtenerVentas } from '@/api/ventas';
import DetalleVentaDialog from '@/components/pos/DetalleVentaDialog';
import type { Venta } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Ban } from 'lucide-react';
import { anularVenta } from '@/api/ventas';
import { useAuthStore } from '@/store/auth';

function fechaLocalISO(fecha: Date) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

function hoyISO() {
  return fechaLocalISO(new Date());
}

function haceDiasISO(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fechaLocalISO(fecha);
}

export default function HistorialVentas() {
  const [ventaParaAnular, setVentaParaAnular] = useState<Venta | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const usuario = useAuthStore((s) => s.usuario);
  const queryClient = useQueryClient();

  const mutacionAnular = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => anularVenta(id, motivo),
    onSuccess: () => {
      toast.success('Venta anulada, stock devuelto al inventario');
      setVentaParaAnular(null);
      setMotivoAnulacion('');
      queryClient.invalidateQueries({ queryKey: ['ventas-historial'] });
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al anular');
    },
  });
  
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);

  const { data: ventas, isLoading } = useQuery({
    queryKey: ['ventas-historial', fechaInicio, fechaFin],
    queryFn: () =>
      obtenerVentas({
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
      }),
  });

  const totalRecaudado = ventas?.filter((v) => !v.anulada).reduce((acc, v) => acc + Number(v.total), 0) ?? 0;

  function filtrarHoy() {
    setFechaInicio(hoyISO());
    setFechaFin(hoyISO());
  }

  function filtrarUltimos7Dias() {
    setFechaInicio(haceDiasISO(7));
    setFechaFin(hoyISO());
  }

  function limpiarFiltros() {
    setFechaInicio('');
    setFechaFin('');
  }

  function tipoVenta(venta: Venta) {
    const tipos = new Set(venta.pedidos.map((p) => p.tipoEntrega));
    if (tipos.size > 1) return 'Mixto';
    if (tipos.has('MESA')) {
      const mesas = venta.pedidos.map((p) => p.mesa?.numero).filter(Boolean);
      return `Mesa ${mesas.join(', ')}`;
    }
    return 'Mostrador';
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Historial de Ventas</h2>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fechaInicio">Desde</Label>
          <Input
            id="fechaInicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="fechaFin">Hasta</Label>
          <Input
            id="fechaFin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={filtrarHoy}>
          Hoy
        </Button>
        <Button variant="outline" onClick={filtrarUltimos7Dias}>
          Últimos 7 días
        </Button>
        <Button variant="ghost" onClick={limpiarFiltros}>
          Ver todo
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ventas en el rango</p>
            <p className="text-2xl font-bold">{ventas?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total recaudado</p>
            <p className="text-2xl font-bold">${totalRecaudado.toLocaleString('es-CO')}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando ventas...</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Método de pago</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Detalle</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ventas?.map((venta) => (
            <TableRow key={venta.id}>
              <TableCell className="text-sm">
                {new Date(venta.fecha).toLocaleString('es-CO')}
              </TableCell>
              <TableCell>{venta.nombreCliente || '—'}</TableCell>
              <TableCell>
                <Badge variant="secondary">{tipoVenta(venta)}</Badge>
              </TableCell>
              <TableCell>{venta.metodoPago.nombre}</TableCell>
              <TableCell>{venta.usuario.nombre}</TableCell>
              <TableCell className="text-right font-medium">
                ${Number(venta.total).toLocaleString('es-CO')}
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => setVentaSeleccionada(venta)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>
                {venta.anulada ? (
                  <Badge variant="destructive">Anulada</Badge>
                ) : (
                  <Badge variant="secondary">Válida</Badge>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                <span className={venta.anulada ? 'text-muted-foreground line-through' : ''}>
                  ${Number(venta.total).toLocaleString('es-CO')}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => setVentaSeleccionada(venta)}>
                  <Eye className="h-4 w-4" />
                </Button>
                {usuario?.rol === 'ADMIN' && !venta.anulada && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setVentaParaAnular(venta)}
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {ventas?.length === 0 && !isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay ventas registradas en este rango de fechas.
        </p>
      )}

      <DetalleVentaDialog
        venta={ventaSeleccionada}
        onOpenChange={(open) => !open && setVentaSeleccionada(null)}
      />

      <Dialog open={!!ventaParaAnular} onOpenChange={(open) => !open && setVentaParaAnular(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Anular venta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esto devolverá el stock al inventario y cancelará los pedidos asociados. Esta acción no se
            puede deshacer.
          </p>
          <div className="flex flex-col gap-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              placeholder="Ej: Cliente se retractó, error de facturación..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVentaParaAnular(null)}>
              Cerrar
            </Button>
            <Button
              variant="destructive"
              disabled={mutacionAnular.isPending}
              onClick={() =>
                ventaParaAnular &&
                mutacionAnular.mutate({ id: ventaParaAnular.id, motivo: motivoAnulacion })
              }
            >
              {mutacionAnular.isPending ? 'Anulando...' : 'Confirmar anulación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}