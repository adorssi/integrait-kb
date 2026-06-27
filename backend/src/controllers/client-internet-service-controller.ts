import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ClientInternetServiceRepository } from '../repositories/client-internet-service-repository';
import { ClientRepository } from '../repositories/client-repository';
import { AppError } from '../middlewares/error-handler';

const safeText = z.string().max(500).trim();
const ipSchema = z.string().max(45).trim();

const serviceSchema = z.object({
  label: safeText.default('WAN'),
  ip: ipSchema.optional().nullable(),
  dynamicIp: z.boolean().optional().default(false),
  isp: safeText.optional().nullable(),
  serviceNumber: safeText.optional().nullable(),
  phone: safeText.optional().nullable(),
  titular: safeText.optional().nullable(),
});

const updateSchema = serviceSchema.partial();

async function assertClientOwnership(clientId: string, serviceId: string): Promise<void> {
  const svc = await ClientInternetServiceRepository.findById(serviceId);
  if (!svc || svc.clientId !== clientId) throw new AppError(404, 'Servicio no encontrado');
}

export const ClientInternetServiceController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientRepository.findById(req.params.clientId);
      if (!client) throw new AppError(404, 'Cliente no encontrado');
      const services = await ClientInternetServiceRepository.findByClient(req.params.clientId);
      res.json({ data: services });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await ClientRepository.findById(req.params.clientId);
      if (!client || !client.active) throw new AppError(404, 'Cliente no encontrado');
      const data = serviceSchema.parse(req.body);
      const service = await ClientInternetServiceRepository.create(req.params.clientId, data);
      res.status(201).json({ data: service });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await assertClientOwnership(req.params.clientId, req.params.serviceId);
      const data = updateSchema.parse(req.body);
      const service = await ClientInternetServiceRepository.update(req.params.serviceId, data);
      res.json({ data: service });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await assertClientOwnership(req.params.clientId, req.params.serviceId);
      await ClientInternetServiceRepository.deactivate(req.params.serviceId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
