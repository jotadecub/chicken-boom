import { Router } from 'express';
import { crearVenta, listarVentas, resumenVentasHoy } from '../controllers/ventas.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.post('/', requireAuth, requireRole('ADMIN', 'VENDEDOR'), crearVenta);
router.get('/', requireAuth, requireRole('ADMIN', 'VENDEDOR'), listarVentas);
router.get('/resumen', requireAuth, requireRole('ADMIN', 'VENDEDOR'), resumenVentasHoy);

export default router;