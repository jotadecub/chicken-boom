import { Router } from 'express';
import { login, perfil } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.get('/perfil', requireAuth, perfil);

export default router;