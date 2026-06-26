import { Router } from 'express';
import { ClientController } from '../controllers/client-controller';
import { EquipmentController } from '../controllers/equipment-controller';
import { ContactController } from '../controllers/contact-controller';
import { BackupController } from '../controllers/backup-controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { Role } from '../models/types';

const router = Router();

// Todos los endpoints requieren autenticación
router.use(authenticate);

// Clientes
router.get('/', ClientController.list);
router.get('/:id', ClientController.getById);
router.get('/:id/detail', ClientController.getDetail);
router.post('/', requireRole(Role.ADMIN), ClientController.create);
router.put('/:id', requireRole(Role.ADMIN), ClientController.update);
router.patch('/:id/deactivate', requireRole(Role.ADMIN), ClientController.deactivate);

// Equipos (anidados bajo cliente)
router.get('/:clientId/equipment', EquipmentController.list);
router.get('/:clientId/equipment/:id', EquipmentController.getDetail);
router.post('/:clientId/equipment', requireRole(Role.ADMIN), EquipmentController.create);
router.put('/:clientId/equipment/:id', requireRole(Role.ADMIN), EquipmentController.update);
router.patch('/:clientId/equipment/:id/deactivate', requireRole(Role.ADMIN), EquipmentController.deactivate);

// Funcionarios (anidados bajo cliente)
router.get('/:clientId/contacts', ContactController.list);
router.post('/:clientId/contacts', requireRole(Role.ADMIN), ContactController.create);
router.put('/:clientId/contacts/:id', requireRole(Role.ADMIN), ContactController.update);
router.delete('/:clientId/contacts/:id', requireRole(Role.ADMIN), ContactController.delete);

// Backups
router.get('/:id/backups', BackupController.listByClient);
router.get('/:id/backups/latest', BackupController.latestByClient);

export default router;
