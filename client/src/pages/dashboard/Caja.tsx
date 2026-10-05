import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { obtenerTurnoActivo, abrirTurno, cerrarTurno } from '@/api/turnosCaja';
import { Lock, Unlock } from 'lucide-react';

export default function Caja() {
  const [montoInicial, setMontoInicial] = useState('');
  const [dialogCierreAbierto, setDialogCierreAbierto] = useState(false);
  const [montoContado, setMontoContado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const queryClient = useQueryClient();

  const { data: turno, isLoading } = useQuery({
    queryKey: ['turno-activo'],
    queryFn: obtenerTurnoActivo,
  });

  const mutacionAbrir = useMutation({
    mutationFn: abrirTurno,
    onSuccess: () => {
      toast.success('Turno de caja abierto');
      setMontoInicial('');
      queryClient.invalidateQueries({ queryKey: ['turno-activo'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al abrir el turno');
    },
  });

  const mutacionCerrar = useMutation({
    mutationFn: ({ id, monto, obs }: { id: string; monto: number; obs?: string }) =>
      cerrarTurno(id, monto, obs),
    onSuccess: () => {
      toast.success('Turno cerrado correctamente');
      setDialogCierreAbierto(false);
      setMontoContado('');
      setObservaciones('');
      queryClient.invalidateQueries({ queryKey: ['turno-activo'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-historial'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al cerrar el turno');
    },
  });

  function handleAbrir() {
    if (!montoInicial) {
      toast.error('Ingresa el monto inicial de la caja');
      return;
    }
    mutacionAbrir.mutate(Number(montoInicial));
  }

  function handleCerrar() {
    if (!turno || !montoContado) {
      toast.error('Ingresa el monto contado en caja');
      return;
    }
    mutacionCerrar.mutate({ id: turno.id, monto: Number(montoContado), obs: observaciones });
  }

  const efectivoEsperado = turno ? Number(turno.montoInicial) + turno.resumen.totalEfectivo : 0;
  const diferenciaPreview = montoContado ? Number(montoContado) - efectivoEsperado : null;

  if (isLoading) return <p className="text-muted-foreground">Cargando...</p>;

  if (!turno) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Caja</h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Unlock className="h-4 w-4" />
              No hay un turno de caja abierto
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>Monto inicial (base para vueltos)</Label>
              <Input
                type="number"
                min={0}
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                placeholder="Ej: 50000"
              />
            </div>
            <Button onClick={handleAbrir} disabled={mutacionAbrir.isPending}>
              {mutacionAbrir.isPending ? 'Abriendo...' : 'Abrir caja'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Caja</h2>
        <Button variant="destructive" onClick={() => setDialogCierreAbierto(true)} className="gap-1">
          <Lock className="h-4 w-4" /> Cerrar caja
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ventas del turno</p>
            <p className="text-2xl font-bold">{turno.resumen.totalVentas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total vendido</p>
            <p className="text-2xl font-bold">${turno.resumen.totalGeneral.toLocaleString('es-CO')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Base inicial</p>
            <p className="text-2xl font-bold">${Number(turno.montoInicial).toLocaleString('es-CO')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Efectivo esperado</p>
            <p className="text-2xl font-bold">${efectivoEsperado.toLocaleString('es-CO')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desglose por método de pago</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {turno.resumen.porMetodoPago.map((m) => (
            <div key={m.nombre} className="flex justify-between text-sm">
              <span>
                {m.nombre} ({m.cantidad} venta{m.cantidad !== 1 ? 's' : ''})
              </span>
              <span className="font-medium">${m.total.toLocaleString('es-CO')}</span>
            </div>
          ))}
          {turno.resumen.porMetodoPago.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay ventas en este turno.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Turno abierto por {turno.usuario.nombre} el{' '}
        {new Date(turno.fechaApertura).toLocaleString('es-CO')}
      </p>

      <Dialog open={dialogCierreAbierto} onOpenChange={setDialogCierreAbierto}>
        <DialogContent className="max-h-[90vh] w-[30vw] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="rounded-md border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base inicial</span>
                <span>${Number(turno.montoInicial).toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">+ Ventas en efectivo</span>
                <span>${turno.resumen.totalEfectivo.toLocaleString('es-CO')}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Efectivo esperado</span>
                <span>${efectivoEsperado.toLocaleString('es-CO')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>¿Cuánto efectivo contaste físicamente?</Label>
              <Input
                type="number"
                min={0}
                value={montoContado}
                onChange={(e) => setMontoContado(e.target.value)}
              />
            </div>

            {diferenciaPreview !== null && (
              <div
                className={`flex items-center justify-between rounded-md p-3 font-bold ${
                  diferenciaPreview === 0
                    ? 'bg-green-50 text-green-700'
                    : diferenciaPreview > 0
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-destructive/10 text-destructive'
                }`}
              >
                <span>
                  {diferenciaPreview === 0
                    ? 'Caja cuadrada'
                    : diferenciaPreview > 0
                      ? 'Sobrante'
                      : 'Faltante'}
                </span>
                <span>${Math.abs(diferenciaPreview).toLocaleString('es-CO')}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Observaciones (opcional)</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: faltaron $2.000, posible error de vuelto"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCierreAbierto(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCerrar} disabled={mutacionCerrar.isPending}>
              {mutacionCerrar.isPending ? 'Cerrando...' : 'Confirmar cierre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}