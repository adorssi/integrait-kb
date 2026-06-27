import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { ClientDocumentRepository } from '../repositories/client-document-repository';
import { AppError } from '../middlewares/error-handler';
import { deleteFile, getFilePath } from '../utils/file-storage';

export const ClientDocumentController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ClientDocumentRepository.findByClient(req.params.clientId);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError(400, 'Archivo requerido');

      const displayName = typeof req.body?.displayName === 'string' && req.body.displayName.trim()
        ? req.body.displayName.trim().slice(0, 255)
        : null;

      const relativePath = path.join('clients', req.file.filename);
      const doc = await ClientDocumentRepository.create({
        clientId: req.params.clientId,
        displayName,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath: relativePath,
      });

      res.status(201).json({ data: doc });
    } catch (err) { next(err); }
  },

  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await ClientDocumentRepository.findById(req.params.docId);
      if (!doc || doc.clientId !== req.params.clientId) {
        throw new AppError(404, 'Documento no encontrado');
      }

      const fullPath = getFilePath(doc.storagePath);
      const downloadName = doc.displayName ?? doc.filename;
      res.download(fullPath, downloadName, (err) => {
        if (err) next(new AppError(500, 'Error al descargar el archivo'));
      });
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await ClientDocumentRepository.findById(req.params.docId);
      if (!doc || doc.clientId !== req.params.clientId) {
        throw new AppError(404, 'Documento no encontrado');
      }
      deleteFile(doc.storagePath);
      await ClientDocumentRepository.delete(req.params.docId);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
