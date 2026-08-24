import { Router } from 'express';
import {
  listarCombos,
  obtenerCombo,
  crearCombo,
  actualizarCombo,
  desactivarCombo,
} from '../controllers/combos.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.get('/', listarCombos);
router.get('/:id', obtenerCombo);
router.post('/', requireAuth, requireRole('ADMIN'), crearCombo);
router.put('/:id', requireAuth, requireRole('ADMIN'), actualizarCombo);
router.delete('/:id', requireAuth, requireRole('ADMIN'), desactivarCombo);

export default router;