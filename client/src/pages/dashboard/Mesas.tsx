import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import MesaCard from '@/components/pos/MesaCard';
import DetalleMesaDialog from '@/components/pos/DetalleMesaDialog';
import { obtenerMesas } from '@/api/catalogo';
import { crearMesa } from '@/api/mesas';
import { useAuthStore } from '@/store/auth';
import type { Mesa } from '@/types';
import { Plus } from 'lucide-react';

export default function Mesas() {
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null);
  const [dialogNuevaMesa, setDialogNuevaMesa] = useState(false);
  const [numeroNuevaMesa, setNumeroNuevaMesa] = useState('');
  const usuario = useAuthStore((s) => s.usuario);
  const queryClient = useQueryClient();

  const { data: mesas, isLoading } = useQuery({ queryKey: ['mesas'], queryFn: obtenerMesas });

  const mutacionCrear = useMutation({
    mutationFn: (numero: number) => crearMesa(numero),
    onSuccess: () => {
      toast.success('Mesa creada');
      setDialogNuevaMesa(false);
      setNumeroNuevaMesa('');
      queryClient.invalidateQueries({ queryKey: ['mesas'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al crear la mesa');
    },
  });

  function handleCrearMesa() {
    const numero = parseInt(numeroNuevaMesa, 10);
    if (!numero || numero <= 0) {
      toast.error('Ingresa un número de mesa válido');
      return;
    }
    mutacionCrear.mutate(numero);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mesas</h2>
        {usuario?.rol === 'ADMIN' && (
          <Button onClick={() => setDialogNuevaMesa(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Nueva mesa
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando mesas...</p>}

      {mesas?.length === 0 && (
        <p className="text-muted-foreground">
          Aún no hay mesas creadas. {usuario?.rol === 'ADMIN' && 'Crea la primera con el botón de arriba.'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {mesas?.map((mesa) => (
          <MesaCard key={mesa.id} mesa={mesa} onClick={() => setMesaSeleccionada(mesa)} />
        ))}
      </div>

      {mesaSeleccionada && (
        <DetalleMesaDialog
          mesa={mesaSeleccionada}
          open={!!mesaSeleccionada}
          onOpenChange={(open) => !open && setMesaSeleccionada(null)}
        />
      )}

      <Dialog open={dialogNuevaMesa} onOpenChange={setDialogNuevaMesa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva mesa</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="numero">Número de mesa</Label>
            <Input
              id="numero"
              type="number"
              min={1}
              value={numeroNuevaMesa}
              onChange={(e) => setNumeroNuevaMesa(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNuevaMesa(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearMesa} disabled={mutacionCrear.isPending}>
              {mutacionCrear.isPending ? 'Creando...' : 'Crear mesa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}