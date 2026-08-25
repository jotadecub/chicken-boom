import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Ventas from '@/pages/dashboard/Ventas';
import Mesas from '@/pages/dashboard/Mesas';
import Inventario from '@/pages/dashboard/Inventario';
import Productos from '@/pages/dashboard/Productos';
import Promociones from '@/pages/dashboard/Promociones';
import Usuarios from '@/pages/dashboard/Usuarios';
import Combos from '@/pages/dashboard/Combos';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard/ventas" element={<Ventas />} />
              <Route path="/dashboard/mesas" element={<Mesas />} />
              <Route path="/dashboard/inventario" element={<Inventario />} />

              <Route element={<ProtectedRoute rolesPermitidos={['ADMIN']} />}>
                <Route path="/dashboard/productos" element={<Productos />} />
                <Route path="/dashboard/promociones" element={<Promociones />} />
                <Route path="/dashboard/usuarios" element={<Usuarios />} />
                <Route path="/dashboard/combos" element={<Combos />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard/ventas" replace />} />
          <Route path="*" element={<Navigate to="/dashboard/ventas" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}