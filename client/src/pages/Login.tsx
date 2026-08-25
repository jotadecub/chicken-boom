import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const setAuth = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    try {
        const { token, usuario } = await login(email, password);
        setAuth(token, usuario);
        toast.success(`Bienvenido, ${usuario.nombre}`);
        navigate('/dashboard/ventas');
    } catch (error) {
        if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error ?? 'Error al iniciar sesión');
        } else {
        toast.error('Error inesperado al iniciar sesión');
        }
    } finally {
        setCargando(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">🍗 Chicken Boom</CardTitle>
          <p className="text-sm text-muted-foreground">Inicia sesión para continuar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={cargando} className="mt-2">
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}