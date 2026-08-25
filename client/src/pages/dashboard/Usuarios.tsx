import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { obtenerUsuarios, crearUsuario, actualizarUsuario, desactivarUsuario } from '@/api/usuarios';
import { useAuthStore } from '@/store/auth';
import type { Usuario, Rol } from '@/types';

interface FormState {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

const FORM_VACIO: FormState = { nombre: '', email: '', password: '', rol: 'VENDEDOR' };

export default function Usuarios() {
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const usuarioActual = useAuthStore((s) => s.usuario);
  const queryClient = useQueryClient();

  const { data: usuarios, isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: obtenerUsuarios });

  const mutacionGuardar = useMutation({
    mutationFn: async () => {
      if (usuarioEditando) {
        return actualizarUsuario(usuarioEditando.id, {
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
          ...(form.password ? { password: form.password } : {}),
        });
      }
      return crearUsuario(form);
    },
    onSuccess: () => {
      toast.success(usuarioEditando ? 'Usuario actualizado' : 'Usuario creado');
      cerrarDialogo();
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al guardar');
    },
  });

  const mutacionDesactivar = useMutation({
    mutationFn: desactivarUsuario,
    onSuccess: () => {
      toast.success('Usuario desactivado');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) toast.error(error.response?.data?.error ?? 'Error al desactivar');
    },
  });

  function abrirCrear() {
    setUsuarioEditando(null);
    setForm(FORM_VACIO);
    setDialogAbierto(true);
  }

  function abrirEditar(usuario: Usuario) {
    setUsuarioEditando(usuario);
    setForm({ nombre: usuario.nombre, email: usuario.email, password: '', rol: usuario.rol });
    setDialogAbierto(true);
  }

  function cerrarDialogo() {
    setDialogAbierto(false);
    setUsuarioEditando(null);
    setForm(FORM_VACIO);
  }

  function handleGuardar() {
    if (!form.nombre.trim() || !form.email.trim()) {
      toast.error('Nombre y correo son obligatorios');
      return;
    }
    if (!usuarioEditando && form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    mutacionGuardar.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Usuarios</h2>
        <Button onClick={abrirCrear} className="gap-1">
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando usuarios...</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios?.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell className="font-medium">{usuario.nombre}</TableCell>
              <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
              <TableCell>
                <Badge variant={usuario.rol === 'ADMIN' ? 'default' : 'secondary'}>
                  {usuario.rol}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">Activo</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => abrirEditar(usuario)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {usuario.id !== usuarioActual?.id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => mutacionDesactivar.mutate(usuario.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogAbierto} onOpenChange={(open) => !open && cerrarDialogo()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{usuarioEditando ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Correo</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>
                Contraseña {usuarioEditando && '(dejar vacío para no cambiarla)'}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Rol</Label>
              <Select
                items={[
                  { label: 'Vendedor', value: 'VENDEDOR' },
                  { label: 'Administrador', value: 'ADMIN' },
                ]}
                value={form.rol}
                onValueChange={(v) => setForm((f) => ({ ...f, rol: (v as Rol) ?? 'VENDEDOR' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={mutacionGuardar.isPending}>
              {mutacionGuardar.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}