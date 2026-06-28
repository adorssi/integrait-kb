import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.post('/verify-password', authenticate, AuthController.verifyPassword);

// 2FA — setup y gestión (requieren autenticación)
router.post('/2fa/setup', authenticate, AuthController.setup2fa);
router.post('/2fa/enable', authenticate, AuthController.enable2fa);
router.post('/2fa/disable', authenticate, AuthController.disable2fa);

// 2FA — segundo paso del login (no requiere authenticate: usa tempToken propio)
router.post('/2fa/login', AuthController.verifyTotpLogin);

export default router;
