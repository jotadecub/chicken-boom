import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import type { Categoria } from '@/types';

interface Props {
  categorias: Categoria[];
  categoriaSeleccionada: string | null;
  onCategoriaChange: (id: string | null) => void;
  busqueda: string;
  onBusquedaChange: (texto: string) => void;
}

export default function FiltrosProductos({
  categorias,
  categoriaSeleccionada,
  onCategoriaChange,
  busqueda,
  onBusquedaChange,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={categoriaSeleccionada === null ? 'default' : 'outline'}
          onClick={() => onCategoriaChange(null)}
        >
          Todas
        </Button>
        {categorias.map((cat) => (
          <Button
            key={cat.id}
            size="sm"
            variant={categoriaSeleccionada === cat.id ? 'default' : 'outline'}
            onClick={() => onCategoriaChange(cat.id)}
          >
            {cat.nombre}
          </Button>
        ))}
      </div>
    </div>
  );
}