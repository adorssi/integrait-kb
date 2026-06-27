import { Router } from 'express';
import { IncidentController } from '../controllers/incident-controller';
import { CommentController } from '../controllers/comment-controller';
import { IncidentAttachmentController } from '../controllers/incident-attachment-controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { buildUploadMiddleware } from '../utils/file-storage';
import { Role } from '../models/types';

const attachmentUpload = buildUploadMiddleware('incidents');

const router = Router();

router.use(authenticate);

router.get('/', IncidentController.list);
router.get('/:id', IncidentController.getById);
router.post('/', IncidentController.create);
router.put('/:id', IncidentController.update);
router.patch('/:id/status', IncidentController.changeStatus);
router.patch('/:id/assign', IncidentController.assignTechnician);
router.post('/:id/solution', IncidentController.registerSolution);

// Comentarios
router.get('/:incidentId/comments', CommentController.list);
router.post('/:incidentId/comments', CommentController.create);
router.delete('/:incidentId/comments/:commentId', CommentController.delete);

// Adjuntos
router.get('/:id/attachments', IncidentAttachmentController.list);
router.post('/:id/attachments', attachmentUpload.single('file'), IncidentAttachmentController.upload);
router.get('/:id/attachments/:attachmentId/download', IncidentAttachmentController.download);
router.delete('/:id/attachments/:attachmentId', IncidentAttachmentController.delete);

export default router;
