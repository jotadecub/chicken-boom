import { Router } from 'express';
import {
  listarInventario,
  alertasStock,
  ajustarStock,
} from '../controllers/inventario.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.get('/', requireAuth, requireRole('ADMIN', 'VENDEDOR'), listarInventario);
router.get('/alertas', requireAuth, requireRole('ADMIN', 'VENDEDOR'), alertasStock);
router.put('/:productoId', requireAuth, requireRole('ADMIN'), ajustarStock);

export default router;