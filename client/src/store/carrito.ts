import { create } from 'zustand';
import type { Producto, Combo } from '@/types';

export interface ItemCarrito {
  key: string; // `producto-${id}` o `combo-${id}`, para identificar filas únicas
  tipo: 'producto' | 'combo';
  id: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  imagenUrl?: string | null;
}

interface CarritoState {
  items: ItemCarrito[];
  agregarProducto: (producto: Producto) => void;
  agregarCombo: (combo: Combo) => void;
  incrementar: (key: string) => void;
  decrementar: (key: string) => void;
  quitar: (key: string) => void;
  limpiar: () => void;
  total: () => number;
}

export const useCarritoStore = create<CarritoState>()((set, get) => ({
  items: [],

  agregarProducto: (producto) =>
    set((state) => {
      const key = `producto-${producto.id}`;
      const existente = state.items.find((i) => i.key === key);
      if (existente) {
        return {
          items: state.items.map((i) =>
            i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            key,
            tipo: 'producto',
            id: producto.id,
            nombre: producto.nombre,
            precioUnitario: Number(producto.precio),
            cantidad: 1,
            imagenUrl: producto.imagenUrl,
          },
        ],
      };
    }),

  agregarCombo: (combo) =>
    set((state) => {
      const key = `combo-${combo.id}`;
      const existente = state.items.find((i) => i.key === key);
      if (existente) {
        return {
          items: state.items.map((i) =>
            i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            key,
            tipo: 'combo',
            id: combo.id,
            nombre: combo.nombre,
            precioUnitario: Number(combo.precioCombo),
            cantidad: 1,
            imagenUrl: combo.imagenUrl,
          },
        ],
      };
    }),

  incrementar: (key) =>
    set((state) => ({
      items: state.items.map((i) => (i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i)),
    })),

  decrementar: (key) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.key === key ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0),
    })),

  quitar: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

  limpiar: () => set({ items: [] }),

  total: () => get().items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0),
}));