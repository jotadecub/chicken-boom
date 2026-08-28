import { Router } from 'express';
import {
  listarPromocionesActivas,
  listarTodasLasPromociones,
  crearPromocion,
  actualizarPromocion,
  desactivarPromocion,
} from '../controllers/promociones.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { reactivarPromocion } from '../controllers/promociones.controller';

const router = Router();

router.get('/', listarPromocionesActivas);
router.get('/todas', requireAuth, requireRole('ADMIN'), listarTodasLasPromociones);
router.post('/', requireAuth, requireRole('ADMIN'), crearPromocion);
router.put('/:id', requireAuth, requireRole('ADMIN'), actualizarPromocion);
router.put('/:id/reactivar', requireAuth, requireRole('ADMIN'), reactivarPromocion);
router.delete('/:id', requireAuth, requireRole('ADMIN'), desactivarPromocion);

export default router;