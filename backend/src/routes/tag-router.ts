import { Router } from 'express';
import { TagController } from '../controllers/tag-controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { Role } from '../models/types';

const router = Router();

router.use(authenticate);

router.get('/', TagController.list);
router.post('/', requireRole(Role.ADMIN), TagController.create);

export default router;
