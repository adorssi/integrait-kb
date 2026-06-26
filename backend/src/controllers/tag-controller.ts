import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TagRepository } from '../repositories/tag-repository';
import { AppError } from '../middlewares/error-handler';

const createSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').toLowerCase(),
});

export const TagController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tags = await TagRepository.findAll();
      res.json({ data: tags });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = createSchema.parse(req.body);
      const existing = await TagRepository.findByName(name);
      if (existing) throw new AppError(409, 'Ya existe un tag con ese nombre');
      const tag = await TagRepository.create(name);
      res.status(201).json({ data: tag });
    } catch (err) {
      next(err);
    }
  },
};
