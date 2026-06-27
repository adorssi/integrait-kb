import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.post('/verify-password', authenticate, AuthController.verifyPassword);

export default router;
