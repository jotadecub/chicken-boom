import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { urlImagen } from '@/lib/config';

interface Props {
  nombre: string;
  precio: number;
  imagenUrl?: string | null;
  stockDisponible?: number;
  esCombo?: boolean;
  onClick: () => void;
}

export default function ProductoCard({
  nombre,
  precio,
  imagenUrl,
  stockDisponible,
  esCombo,
  onClick,
}: Props) {
  const sinStock = stockDisponible !== undefined && stockDisponible <= 0;

  return (
    <Card
      onClick={sinStock ? undefined : onClick}
      className={cn(
        'cursor-pointer gap-0 overflow-hidden p-0 transition-all hover:shadow-md active:scale-95',
        sinStock && 'cursor-not-allowed opacity-50'
      )}
    >
      <div className="flex aspect-square w-full items-center justify-center bg-muted">
        {imagenUrl ? (
          <img
            src={urlImagen(imagenUrl)}
            alt={nombre}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl">{esCombo ? '🎁' : '🍗'}</span>
        )}
      </div>
      <CardContent className="p-3">
        <p className="line-clamp-2 text-sm font-medium leading-tight">{nombre}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-bold text-primary">${precio.toLocaleString('es-CO')}</span>
          {esCombo && (
            <Badge variant="secondary" className="text-xs">
              Combo
            </Badge>
          )}
        </div>
        {sinStock && (
          <Badge variant="destructive" className="mt-1 text-xs">
            Sin stock
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}