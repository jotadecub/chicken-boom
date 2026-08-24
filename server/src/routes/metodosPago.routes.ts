import { Router } from 'express';
import {
  listarMetodosPago,
  listarTodosLosMetodosPago,
  crearMetodoPago,
  actualizarMetodoPago,
  desactivarMetodoPago,
} from '../controllers/metodosPago.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.get('/', listarMetodosPago);
router.get('/todos', requireAuth, requireRole('ADMIN'), listarTodosLosMetodosPago);
router.post('/', requireAuth, requireRole('ADMIN'), crearMetodoPago);
router.put('/:id', requireAuth, requireRole('ADMIN'), actualizarMetodoPago);
router.delete('/:id', requireAuth, requireRole('ADMIN'), desactivarMetodoPago);

export default router;