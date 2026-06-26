import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CommentService } from '../services/comment-service';

const createSchema = z.object({
  content: z.string().min(1, 'El comentario no puede estar vacío').max(2000),
});

export const CommentController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comments = await CommentService.list(req.params.incidentId);
      res.json({ data: comments });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { content } = createSchema.parse(req.body);
      const technicianId = req.technician!.sub;
      const comment = await CommentService.create(req.params.incidentId, content, technicianId);
      res.status(201).json({ data: comment });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requesterId = req.technician!.sub;
      const requesterRole = req.technician!.role;
      await CommentService.delete(req.params.commentId, requesterId, requesterRole);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
