export type Rol = 'ADMIN' | 'VENDEDOR';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface Categoria {
  id: string;
  nombre: string;
}

export interface Inventario {
  id: string;
  stockActual: number;
  stockMinimo: number;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: string; // Prisma Decimal llega como string por JSON
  imagenUrl?: string | null;
  activo: boolean;
  categoriaId?: string | null;
  categoria?: Categoria | null;
  inventario?: Inventario | null;
}

export interface ComboItem {
  id: string;
  productoId: string;
  cantidad: number;
  producto: Producto;
}

export interface Combo {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precioCombo: string;
  imagenUrl?: string | null;
  activo: boolean;
  items: ComboItem[];
}

export type TipoPromocion = 'DOS_POR_UNO' | 'PRECIO_FIJO_COMBO' | 'PORCENTAJE' | 'MONTO_FIJO';

export interface Promocion {
  id: string;
  nombre: string;
  tipo: TipoPromocion;
  valor?: string | null;
  productoId?: string | null;
  comboId?: string | null;
  categoriaId?: string | null;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export type EstadoMesa = 'LIBRE' | 'OCUPADA';

export interface Mesa {
  id: string;
  numero: number;
  estado: EstadoMesa;
  pedidos?: { id: string; estado: string; creadoEn: string }[];
}

export type TipoEntrega = 'MESA' | 'MOSTRADOR';
export type EstadoPedido = 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO' | 'ENTREGADO' | 'CANCELADO';

export interface PedidoItem {
  id: string;
  productoId?: string | null;
  comboId?: string | null;
  promocionId?: string | null;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
  producto?: Producto | null;
  combo?: Combo | null;
  promocion?: Promocion | null;
}

export interface Pedido {
  id: string;
  mesaId?: string | null;
  tipoEntrega: TipoEntrega;
  estado: EstadoPedido;
  usuarioId: string;
  ventaId?: string | null;
  creadoEn: string;
  items: PedidoItem[];
  mesa?: Mesa | null;
  usuario?: { id: string; nombre: string };
}

export interface MetodoPago {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Venta {
  id: string;
  fecha: string;
  total: string;
  nombreCliente?: string | null;
  usuarioId: string;
  metodoPagoId: string;
  pedidos: Pedido[];
  metodoPago: MetodoPago;
  usuario: { id: string; nombre: string };
}