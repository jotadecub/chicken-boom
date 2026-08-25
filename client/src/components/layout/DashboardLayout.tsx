import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { LogOut, ShoppingCart, Package, Users, Tag, Gift, Table2 } from 'lucide-react';
import { Package2 } from 'lucide-react';

const navItems = [
  { to: '/dashboard/ventas', label: 'Ventas', icon: ShoppingCart, soloAdmin: false },
  { to: '/dashboard/mesas', label: 'Mesas', icon: Table2, soloAdmin: false },
  { to: '/dashboard/inventario', label: 'Inventario', icon: Package, soloAdmin: false },
  { to: '/dashboard/productos', label: 'Productos', icon: Tag, soloAdmin: true },
  { to: '/dashboard/combos', label: 'Combos', icon: Package2, soloAdmin: true },
  { to: '/dashboard/promociones', label: 'Promociones', icon: Gift, soloAdmin: true },
  { to: '/dashboard/usuarios', label: 'Usuarios', icon: Users, soloAdmin: true },
];

export default function DashboardLayout() {
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-60 flex-col border-r bg-card">
        <div className="border-b p-4">
          <h1 className="text-lg font-bold">🍗 Chicken Boom</h1>
          <p className="text-xs text-muted-foreground">
            {usuario?.nombre} · {usuario?.rol}
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems
            .filter((item) => !item.soloAdmin || usuario?.rol === 'ADMIN')
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="border-t p-2">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}