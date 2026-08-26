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

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

function haceDiasISO(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().split('T')[0];
}

export default function HistorialVentas() {
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

  const totalRecaudado = ventas?.reduce((acc, v) => acc + Number(v.total), 0) ?? 0;

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
    </div>
  );
}