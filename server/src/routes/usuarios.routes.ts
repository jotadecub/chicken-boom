import { Router } from 'express';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
} from '../controllers/usuarios.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

// Todo el módulo de usuarios es exclusivo de ADMIN
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', listarUsuarios);
router.get('/:id', obtenerUsuario);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', desactivarUsuario);

export default router;