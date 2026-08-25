import { Router } from 'express';
import {
  listarMesas,
  crearMesa,
  actualizarMesa,
  eliminarMesa,
} from '../controllers/mesas.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'VENDEDOR'));

router.get('/', listarMesas);
router.post('/', requireRole('ADMIN'), crearMesa);
router.put('/:id', requireRole('ADMIN'), actualizarMesa);
router.delete('/:id', requireRole('ADMIN'), eliminarMesa);

export default router;