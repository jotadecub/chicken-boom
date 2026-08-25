import { Router } from 'express';
import {
  crearPedido,
  listarPedidosActivos,
  actualizarEstadoPedido,
} from '../controllers/pedidos.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'VENDEDOR'));

router.post('/', crearPedido);
router.get('/', listarPedidosActivos);
router.put('/:id/estado', actualizarEstadoPedido);

export default router;