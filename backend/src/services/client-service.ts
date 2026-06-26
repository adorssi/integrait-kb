import { Client } from '@prisma/client';
import { ClientRepository } from '../repositories/client-repository';
import { ICreateClientDTO, IUpdateClientDTO, IClientFilters } from '../models/types';
import { AppError } from '../middlewares/error-handler';

export const ClientService = {
  async list(filters: IClientFilters): Promise<Client[]> {
    return ClientRepository.findAll(filters);
  },

  async getById(id: string): Promise<Client> {
    const client = await ClientRepository.findById(id);
    if (!client) throw new AppError(404, 'Cliente no encontrado');
    return client;
  },

  /**
   * Devuelve el cliente con equipos, funcionarios e incidentes recientes.
   * Usado para el panel de detalle del cliente.
   */
  async getDetail(id: string) {
    const client = await ClientRepository.findByIdWithDetail(id);
    if (!client) throw new AppError(404, 'Cliente no encontrado');
    return client;
  },

  async create(data: ICreateClientDTO): Promise<Client> {
    const existing = await ClientRepository.findByRut(data.rut);
    if (existing) throw new AppError(409, 'Ya existe un cliente con ese RUT');
    return ClientRepository.create(data);
  },

  async update(id: string, data: IUpdateClientDTO): Promise<Client> {
    await ClientService.getById(id);

    if (data.rut) {
      const existing = await ClientRepository.findByRut(data.rut);
      if (existing && existing.id !== id) {
        throw new AppError(409, 'Ya existe un cliente con ese RUT');
      }
    }

    return ClientRepository.update(id, data);
  },

  async deactivate(id: string): Promise<Client> {
    await ClientService.getById(id);
    return ClientRepository.deactivate(id);
  },
};
