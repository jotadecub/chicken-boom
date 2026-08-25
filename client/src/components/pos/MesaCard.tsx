import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Mesa } from '@/types';

interface Props {
  mesa: Mesa;
  onClick: () => void;
}

export default function MesaCard({ mesa, onClick }: Props) {
  const ocupada = mesa.estado === 'OCUPADA';
  const pedidosActivos = mesa.pedidos?.length ?? 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md active:scale-95',
        ocupada ? 'border-orange-400 bg-orange-50' : 'border-green-400 bg-green-50'
      )}
    >
      <CardContent className="flex flex-col items-center justify-center gap-2 p-6">
        <span className="text-3xl">🍽️</span>
        <p className="text-lg font-bold">Mesa {mesa.numero}</p>
        <Badge variant={ocupada ? 'default' : 'secondary'}>
          {ocupada ? 'Ocupada' : 'Libre'}
        </Badge>
        {pedidosActivos > 0 && (
          <p className="text-xs text-muted-foreground">
            {pedidosActivos} pedido{pedidosActivos > 1 ? 's' : ''} activo{pedidosActivos > 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}