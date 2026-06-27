import { Router } from 'express';
import { TechnicianController } from '../controllers/technician-controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { Role } from '../models/types';

const router = Router();

router.use(authenticate);

// Lectura accesible para cualquier usuario autenticado
router.get('/', TechnicianController.list);
router.get('/:id', TechnicianController.getById);

// Escritura solo para ADMIN
router.post('/', requireRole(Role.ADMIN), TechnicianController.create);
router.put('/:id', requireRole(Role.ADMIN), TechnicianController.update);
router.patch('/:id/deactivate', requireRole(Role.ADMIN), TechnicianController.deactivate);
router.patch('/:id/activate', requireRole(Role.ADMIN), TechnicianController.activate);
router.patch('/:id/unlock', requireRole(Role.ADMIN), TechnicianController.unlock);

export default router;
