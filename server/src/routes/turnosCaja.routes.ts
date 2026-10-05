import { Router } from 'express';
import {
  obtenerTurnoActivo,
  abrirTurno,
  cerrarTurno,
  listarTurnos,
} from '../controllers/turnosCaja.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'VENDEDOR'));

router.get('/activo', obtenerTurnoActivo);
router.post('/abrir', abrirTurno);
router.post('/:id/cerrar', cerrarTurno);
router.get('/', listarTurnos);

export default router;