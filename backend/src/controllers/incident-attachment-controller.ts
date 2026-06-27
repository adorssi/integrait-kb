import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { IncidentAttachmentRepository } from '../repositories/incident-attachment-repository';
import { AppError } from '../middlewares/error-handler';
import { deleteFile, getFilePath } from '../utils/file-storage';

export const IncidentAttachmentController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await IncidentAttachmentRepository.findByIncident(req.params.id);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(400, 'Archivo requerido');

      const relativePath = path.join('incidents', req.file.filename);
      const attachment = await IncidentAttachmentRepository.create({
        incidentId: req.params.id,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath: relativePath,
      });

      res.status(201).json({ data: attachment });
    } catch (err) { next(err); }
  },

  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const att = await IncidentAttachmentRepository.findById(req.params.attachmentId);
      if (!att || att.incidentId !== req.params.id) {
        throw new AppError(404, 'Adjunto no encontrado');
      }

      const fullPath = getFilePath(att.storagePath);
      res.download(fullPath, att.filename, (err) => {
        if (err) next(new AppError(500, 'Error al descargar el archivo'));
      });
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const att = await IncidentAttachmentRepository.findById(req.params.attachmentId);
      if (!att || att.incidentId !== req.params.id) {
        throw new AppError(404, 'Adjunto no encontrado');
      }
      deleteFile(att.storagePath);
      await IncidentAttachmentRepository.delete(req.params.attachmentId);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
