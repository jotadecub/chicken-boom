import { Router } from 'express';
import {
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  desactivarProducto,
} from '../controllers/productos.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.get('/', listarProductos);
router.get('/:id', obtenerProducto);
router.post('/', requireAuth, requireRole('ADMIN'), crearProducto);
router.put('/:id', requireAuth, requireRole('ADMIN'), actualizarProducto);
router.delete('/:id', requireAuth, requireRole('ADMIN'), desactivarProducto);

export default router;