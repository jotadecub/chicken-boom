import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import {
  LogOut,
  ShoppingCart,
  Package,
  Package2,
  Users,
  Tag,
  Gift,
  Table2,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard/ventas', label: 'Ventas', icon: ShoppingCart, soloAdmin: false },
  { to: '/dashboard/mesas', label: 'Mesas', icon: Table2, soloAdmin: false },
  { to: '/dashboard/historial', label: 'Historial', icon: History, soloAdmin: true },
  { to: '/dashboard/inventario', label: 'Inventario', icon: Package, soloAdmin: false },
  { to: '/dashboard/productos', label: 'Productos', icon: Tag, soloAdmin: true },
  { to: '/dashboard/combos', label: 'Combos', icon: Package2, soloAdmin: true },
  { to: '/dashboard/promociones', label: 'Promociones', icon: Gift, soloAdmin: true },
  { to: '/dashboard/usuarios', label: 'Usuarios', icon: Users, soloAdmin: true },
];

export default function DashboardLayout() {
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();
  const [colapsada, setColapsada] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-svh">
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-200',
          colapsada ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex items-center justify-between border-b p-4">
          {!colapsada && (
            <div className="overflow-hidden">
              <h1 className="truncate text-lg font-bold">🍗 Chicken Boom</h1>
              <p className="truncate text-xs text-muted-foreground">
                {usuario?.nombre} · {usuario?.rol}
              </p>
            </div>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={() => setColapsada((c) => !c)}
          >
            {colapsada ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems
            .filter((item) => !item.soloAdmin || usuario?.rol === 'ADMIN')
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={colapsada ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    colapsada && 'justify-center px-2',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!colapsada && item.label}
              </NavLink>
            ))}
        </nav>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            className={cn('w-full gap-2', colapsada ? 'justify-center px-2' : 'justify-start')}
            onClick={handleLogout}
            title={colapsada ? 'Cerrar sesión' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!colapsada && 'Cerrar sesión'}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}