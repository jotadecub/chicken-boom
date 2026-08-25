import { Router } from 'express';
import { listarCategorias, crearCategoria, eliminarCategoria } from '../controllers/categorias.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.get('/', listarCategorias);
router.post('/', requireAuth, requireRole('ADMIN'), crearCategoria);
router.delete('/:id', requireAuth, requireRole('ADMIN'), eliminarCategoria);

export default router;