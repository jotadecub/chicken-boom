import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import type { Rol } from '@/types';

interface Props {
  rolesPermitidos?: Rol[];
}

export default function ProtectedRoute({ rolesPermitidos }: Props) {
  const { token, usuario } = useAuthStore();

  if (!token || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/dashboard/ventas" replace />;
  }

  return <Outlet />;
}