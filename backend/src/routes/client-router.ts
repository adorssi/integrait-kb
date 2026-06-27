import { Router } from 'express';
import multer from 'multer';
import { ClientController } from '../controllers/client-controller';
import { EquipmentController } from '../controllers/equipment-controller';
import { ContactController } from '../controllers/contact-controller';
import { BackupController } from '../controllers/backup-controller';
import { NVRController } from '../controllers/nvr-controller';
import { CameraController } from '../controllers/camera-controller';
import { BranchController } from '../controllers/branch-controller';
import { ImportController } from '../controllers/import-controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { Role } from '../models/types';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

// Todos los endpoints requieren autenticación
router.use(authenticate);

// Clientes
router.get('/', ClientController.list);
router.get('/:id', ClientController.getById);
router.get('/:id/detail', ClientController.getDetail);
router.post('/', requireRole(Role.ADMIN), ClientController.create);
router.put('/:id', requireRole(Role.ADMIN), ClientController.update);
router.patch('/:id/infrastructure', ClientController.updateInfrastructure);
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

// Sucursales y segmentos de red
router.get('/:clientId/branches', BranchController.list);
router.post('/:clientId/branches', BranchController.create);
router.put('/:clientId/branches/:branchId', BranchController.update);
router.patch('/:clientId/branches/:branchId/deactivate', requireRole(Role.ADMIN), BranchController.deactivate);
router.post('/:clientId/branches/:branchId/segments', BranchController.createSegment);
router.put('/:clientId/branches/:branchId/segments/:segmentId', BranchController.updateSegment);
router.delete('/:clientId/branches/:branchId/segments/:segmentId', BranchController.deleteSegment);

// Importación masiva via Excel
router.post('/:clientId/equipment/import', upload.single('file'), ImportController.importEquipment);
router.post('/:clientId/cameras/import', upload.single('file'), ImportController.importCameras);

// Backups
router.get('/:id/backups', BackupController.listByClient);
router.get('/:id/backups/latest', BackupController.latestByClient);

// NVRs — cualquier usuario autenticado puede gestionar y ver credenciales
router.get('/:clientId/nvrs', NVRController.list);
router.post('/:clientId/nvrs', NVRController.create);
router.put('/:clientId/nvrs/:nvrId', NVRController.update);
router.get('/:clientId/nvrs/:nvrId/credentials', NVRController.getCredentials);
router.patch('/:clientId/nvrs/:nvrId/deactivate', requireRole(Role.ADMIN), NVRController.deactivate);

// Cámaras — cualquier usuario autenticado puede gestionar y ver credenciales
router.get('/:clientId/cameras', CameraController.list);
router.post('/:clientId/cameras', CameraController.create);
router.put('/:clientId/cameras/:cameraId', CameraController.update);
router.get('/:clientId/cameras/:cameraId/credentials', CameraController.getCredentials);
router.patch('/:clientId/cameras/:cameraId/deactivate', requireRole(Role.ADMIN), CameraController.deactivate);

export default router;
