import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { Role } from '../models/types';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.put('/me', authenticate, AuthController.updateMe);
router.post('/verify-password', authenticate, AuthController.verifyPassword);

// 2FA — setup y habilitación (requieren autenticación)
router.post('/2fa/setup', authenticate, AuthController.setup2fa);
router.post('/2fa/enable', authenticate, AuthController.enable2fa);

// 2FA — desactivar propio: solo ADMIN (técnicos no pueden desactivar su propio 2FA)
router.post('/2fa/disable', authenticate, requireRole(Role.ADMIN), AuthController.disable2fa);

// 2FA — flujo de login (no requieren authenticate: usan tempToken propio)
router.post('/2fa/login', AuthController.verifyTotpLogin);
router.post('/2fa/setup-forced', AuthController.setupForced2fa);
router.post('/2fa/enable-forced', AuthController.enableForced2fa);

export default router;
