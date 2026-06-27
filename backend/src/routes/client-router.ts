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
import { ClientCredentialController } from '../controllers/client-credential-controller';
import { ClientWifiController } from '../controllers/client-wifi-controller';
import { ClientDocumentController } from '../controllers/client-document-controller';
import { ClientInternetServiceController } from '../controllers/client-internet-service-controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { buildUploadMiddleware } from '../utils/file-storage';
import { Role } from '../models/types';

const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const docUpload = buildUploadMiddleware('clients');

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

// Equipos (anidados bajo cliente) — cualquier usuario autenticado puede gestionar
router.get('/:clientId/equipment', EquipmentController.list);
router.get('/:clientId/equipment/:id', EquipmentController.getDetail);
router.get('/:clientId/equipment/:id/credentials', EquipmentController.getCredentials);
router.post('/:clientId/equipment', EquipmentController.create);
router.put('/:clientId/equipment/:id', EquipmentController.update);
router.patch('/:clientId/equipment/:id/deactivate', EquipmentController.deactivate);

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
router.post('/:clientId/equipment/import', importUpload.single('file'), ImportController.importEquipment);
router.post('/:clientId/cameras/import', importUpload.single('file'), ImportController.importCameras);

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

// Credenciales genéricas del cliente
router.get('/:clientId/credentials', ClientCredentialController.list);
router.post('/:clientId/credentials', ClientCredentialController.create);
router.get('/:clientId/credentials/:credId/password', ClientCredentialController.getPassword);
router.put('/:clientId/credentials/:credId', ClientCredentialController.update);
router.delete('/:clientId/credentials/:credId', ClientCredentialController.delete);

// WiFi del cliente
router.get('/:clientId/wifi', ClientWifiController.list);
router.post('/:clientId/wifi', ClientWifiController.create);
router.get('/:clientId/wifi/:wifiId/password', ClientWifiController.getPassword);
router.put('/:clientId/wifi/:wifiId', ClientWifiController.update);
router.delete('/:clientId/wifi/:wifiId', ClientWifiController.delete);

// Documentos del cliente
router.get('/:clientId/documents', ClientDocumentController.list);
router.post('/:clientId/documents', docUpload.single('file'), ClientDocumentController.upload);
router.get('/:clientId/documents/:docId/download', ClientDocumentController.download);
router.delete('/:clientId/documents/:docId', ClientDocumentController.delete);

// Servicios de internet del cliente
router.get('/:clientId/internet-services', ClientInternetServiceController.list);
router.post('/:clientId/internet-services', ClientInternetServiceController.create);
router.put('/:clientId/internet-services/:serviceId', ClientInternetServiceController.update);
router.delete('/:clientId/internet-services/:serviceId', ClientInternetServiceController.remove);

export default router;
