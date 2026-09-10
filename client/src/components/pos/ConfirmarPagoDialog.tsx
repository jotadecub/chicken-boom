import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { MetodoPago } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo?: string;
  total: number;
  ahorroTotal?: number;
  metodosPago: MetodoPago[];
  procesando?: boolean;
  onConfirmar: (datos: { metodoPagoId: string; nombreCliente?: string }) => void;
}

export default function ConfirmarPagoDialog({
  open,
  onOpenChange,
  titulo = 'Confirmar venta',
  total,
  ahorroTotal = 0,
  metodosPago,
  procesando,
  onConfirmar,
}: Props) {
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');

  const metodoSeleccionado = metodosPago.find((mp) => mp.id === metodoPagoId);
  const esEfectivo = metodoSeleccionado?.nombre.toLowerCase().includes('efectivo') ?? false;
  const cambio = montoRecibido ? Number(montoRecibido) - total : null;

  function handleConfirmar() {
    onConfirmar({ metodoPagoId, nombreCliente: nombreCliente || undefined });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[30vw] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-md border p-3">
            {ahorroTotal > 0 && (
              <div className="flex items-center justify-between text-sm text-green-600">
                <span>Ahorro por promociones</span>
                <span>-${ahorroTotal.toLocaleString('es-CO')}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total a cobrar</span>
              <span>${total.toLocaleString('es-CO')}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Nombre del cliente (opcional)</Label>
            <Input
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              placeholder="Para la factura"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Método de pago</Label>
            <Select
              items={metodosPago.map((mp) => ({ label: mp.nombre, value: mp.id }))}
              value={metodoPagoId}
              onValueChange={(v) => setMetodoPagoId(v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un método" />
              </SelectTrigger>
              <SelectContent>
                {metodosPago.map((mp) => (
                  <SelectItem key={mp.id} value={mp.id}>
                    {mp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {esEfectivo && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <Label>¿Con cuánto paga el cliente?</Label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Ej: 50000"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                />
              </div>

              {cambio !== null && (
                <div
                  className={`flex items-center justify-between rounded-md p-3 text-lg font-bold ${cambio < 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-700'
                    }`}
                >
                  <span>{cambio < 0 ? 'Falta' : 'Cambio a devolver'}</span>
                  <span>${Math.abs(cambio).toLocaleString('es-CO')}</span>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={
              procesando ||
              !metodoPagoId ||
              (esEfectivo && cambio !== null && cambio < 0)
            }
          >
            {procesando ? 'Procesando...' : 'Confirmar y cobrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}