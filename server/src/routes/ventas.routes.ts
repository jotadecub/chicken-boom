import { Router } from 'express';
import {
  crearVenta,
  ventaRapidaMostrador,
  listarVentas,
  resumenVentasHoy,
  anularVenta,
} from '../controllers/ventas.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'VENDEDOR'));

router.post('/', crearVenta);
router.post('/rapida', ventaRapidaMostrador);
router.get('/', listarVentas);
router.get('/resumen', resumenVentasHoy);
router.post('/:id/anular', requireRole('ADMIN'), anularVenta);

export default router;