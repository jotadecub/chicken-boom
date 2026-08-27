import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Trash2, ImageIcon } from 'lucide-react';
import { subirImagen, listarImagenes, eliminarImagen } from '@/api/imagenes';
import { urlImagen } from '@/lib/config';

interface Props {
  valor: string; // ruta relativa guardada en el formulario (ej: "/uploads/productos/xxx.jpg")
  onChange: (ruta: string) => void;
}

export default function SelectorImagen({ valor, onChange }: Props) {
  const [galeriaAbierta, setGaleriaAbierta] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: imagenes } = useQuery({
    queryKey: ['imagenes'],
    queryFn: listarImagenes,
    enabled: galeriaAbierta,
  });

  const mutacionSubir = useMutation({
    mutationFn: subirImagen,
    onSuccess: (imagen) => {
      toast.success('Imagen subida');
      onChange(imagen.url);
      queryClient.invalidateQueries({ queryKey: ['imagenes'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al subir la imagen');
    },
  });

  const mutacionEliminar = useMutation({
    mutationFn: eliminarImagen,
    onSuccess: () => {
      toast.success('Imagen eliminada');
      queryClient.invalidateQueries({ queryKey: ['imagenes'] });
    },
  });

  function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) mutacionSubir.mutate(archivo);
    e.target.value = ''; // permite volver a subir el mismo archivo si es necesario
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-30">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {valor ? (
            <img src={urlImagen(valor)} alt="Vista previa" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleArchivoSeleccionado}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={mutacionSubir.isPending}
          >
            <Upload className="mr-1 h-3 w-3" />
            {mutacionSubir.isPending ? 'Subiendo...' : 'Subir nueva'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setGaleriaAbierta(true)}
          >
            Elegir de la galería
          </Button>
        </div>
      </div>

      <Dialog open={galeriaAbierta} onOpenChange={setGaleriaAbierta}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Galería de imágenes</DialogTitle>
          </DialogHeader>

          {imagenes?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay imágenes subidas todavía.
            </p>
          )}

          <div className="grid grid-cols-4 gap-3">
            {imagenes?.map((img) => (
              <div key={img.nombre} className="group relative">
                <button
                  type="button"
                  className="aspect-square w-full overflow-hidden rounded-md border hover:ring-2 hover:ring-primary"
                  onClick={() => {
                    onChange(img.url);
                    setGaleriaAbierta(false);
                  }}
                >
                  <img
                    src={urlImagen(img.url)}
                    alt={img.nombre}
                    className="h-full w-full object-cover"
                  />
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => mutacionEliminar.mutate(img.nombre)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}