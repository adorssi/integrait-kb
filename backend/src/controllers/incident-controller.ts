import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { IncidentService } from '../services/incident-service';
import { IncidentStatus, Priority } from '../models/types';

const createSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  description: z.string().min(1, 'Descripción requerida'),
  clientId: z.string().uuid('clientId debe ser un UUID'),
  priority: z.nativeEnum(Priority).optional(),
  technicianId: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  priority: z.nativeEnum(Priority).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

const statusSchema = z.object({
  status: z.nativeEnum(IncidentStatus),
});

const assignSchema = z.object({
  technicianId: z.string().uuid().nullable(),
});

const solutionSchema = z.object({
  description: z.string().min(20, 'La descripción debe tener al menos 20 caracteres'),
  timeSpentMinutes: z.number().int().positive('El tiempo debe ser un número positivo'),
});

const filtersSchema = z.object({
  clientId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  equipmentId: z.string().uuid().optional(),
});

export const IncidentController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = filtersSchema.parse(req.query);
      const incidents = await IncidentService.list(filters);
      res.json({ data: incidents });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incident = await IncidentService.getById(req.params.id);
      res.json({ data: incident });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createSchema.parse(req.body);
      const incident = await IncidentService.create(data);
      res.status(201).json({ data: incident });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateSchema.parse(req.body);
      const incident = await IncidentService.update(req.params.id, data);
      res.json({ data: incident });
    } catch (err) {
      next(err);
    }
  },

  async changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = statusSchema.parse(req.body);
      const incident = await IncidentService.changeStatus(req.params.id, status);
      res.json({ data: incident });
    } catch (err) {
      next(err);
    }
  },

  async assignTechnician(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { technicianId } = assignSchema.parse(req.body);
      const incident = await IncidentService.assignTechnician(req.params.id, technicianId);
      res.json({ data: incident });
    } catch (err) {
      next(err);
    }
  },

  async registerSolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = solutionSchema.parse(req.body);
      const incident = await IncidentService.registerSolution(req.params.id, data);
      res.status(201).json({ data: incident });
    } catch (err) {
      next(err);
    }
  },
};
