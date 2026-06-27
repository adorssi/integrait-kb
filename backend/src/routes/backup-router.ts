import { Router } from 'express';
import { BackupController } from '../controllers/backup-controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { Role } from '../models/types';

const router = Router();

router.use(authenticate);

router.get('/status', BackupController.status);
router.get('/all-clients-status', BackupController.allClientsStatus);
router.get('/failed-clients', BackupController.failedClients);
router.get('/unmatched-names', requireRole(Role.ADMIN), BackupController.unmatchedNames);
router.post('/sync', requireRole(Role.ADMIN), BackupController.sync);

export default router;
