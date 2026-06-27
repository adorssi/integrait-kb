import { Router } from 'express';
import { TechnicianController } from '../controllers/technician-controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { Role } from '../models/types';

const router = Router();

router.use(authenticate, requireRole(Role.ADMIN));

router.get('/', TechnicianController.list);
router.get('/:id', TechnicianController.getById);
router.post('/', TechnicianController.create);
router.put('/:id', TechnicianController.update);
router.patch('/:id/deactivate', TechnicianController.deactivate);
router.patch('/:id/unlock', TechnicianController.unlock);

export default router;
