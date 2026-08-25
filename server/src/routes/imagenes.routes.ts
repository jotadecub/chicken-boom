import { Router } from 'express';
import { upload } from '../lib/upload';
import { subirImagen, listarImagenes, eliminarImagen } from '../controllers/imagenes.controller';
import { requireAuth, requireRole } from '../middlewares/auth';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.post('/upload', upload.single('imagen'), subirImagen);
router.get('/', listarImagenes);
router.delete('/:nombre', eliminarImagen);

export default router;