import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BranchService } from '../services/branch-service';

const branchSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  address: z.string().optional().nullable(),
  publicIp: z.string().optional().nullable(),
  dynamicIp: z.boolean().optional(),
  isp: z.string().optional().nullable(),
});

const segmentSchema = z.object({
  vlan: z.coerce.number().int().min(1).max(4094).optional().nullable(),
  networkRange: z.string().min(1, 'Rango de red requerido'),
  description: z.string().optional().nullable(),
});

export const BranchController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const branches = await BranchService.listByClient(req.params.clientId);
      res.json({ data: branches });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = branchSchema.parse(req.body);
      const branch = await BranchService.create({ clientId: req.params.clientId, ...data });
      res.status(201).json({ data: branch });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = branchSchema.partial().parse(req.body);
      const branch = await BranchService.update(req.params.branchId, data);
      res.json({ data: branch });
    } catch (err) {
      next(err);
    }
  },

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await BranchService.deactivate(req.params.branchId);
      res.json({ data: null });
    } catch (err) {
      next(err);
    }
  },

  async createSegment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = segmentSchema.parse(req.body);
      const segment = await BranchService.createSegment({ branchId: req.params.branchId, ...data });
      res.status(201).json({ data: segment });
    } catch (err) {
      next(err);
    }
  },

  async updateSegment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = segmentSchema.partial().parse(req.body);
      const segment = await BranchService.updateSegment(req.params.segmentId, data);
      res.json({ data: segment });
    } catch (err) {
      next(err);
    }
  },

  async deleteSegment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await BranchService.deleteSegment(req.params.segmentId);
      res.json({ data: null });
    } catch (err) {
      next(err);
    }
  },
};
