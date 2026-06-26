import { Equipment } from '@prisma/client';
import { EquipmentRepository } from '../repositories/equipment-repository';
import { ClientRepository } from '../repositories/client-repository';
import { ICreateEquipmentDTO, IUpdateEquipmentDTO } from '../models/types';
import { AppError } from '../middlewares/error-handler';

export const EquipmentService = {
  async listByClient(clientId: string): Promise<Equipment[]> {
    const client = await ClientRepository.findById(clientId);
    if (!client) throw new AppError(404, 'Cliente no encontrado');
    return EquipmentRepository.findByClient(clientId);
  },

  async getDetail(clientId: string, equipmentId: string) {
    const equipment = await EquipmentRepository.findByIdWithIncidents(equipmentId);
    if (!equipment || equipment.clientId !== clientId) {
      throw new AppError(404, 'Equipo no encontrado');
    }
    return equipment;
  },

  async create(clientId: string, data: ICreateEquipmentDTO): Promise<Equipment> {
    const client = await ClientRepository.findById(clientId);
    if (!client || !client.active) throw new AppError(404, 'Cliente no encontrado');
    return EquipmentRepository.create(clientId, data);
  },

  async update(clientId: string, equipmentId: string, data: IUpdateEquipmentDTO): Promise<Equipment> {
    const equipment = await EquipmentRepository.findById(equipmentId);
    if (!equipment || equipment.clientId !== clientId) {
      throw new AppError(404, 'Equipo no encontrado');
    }
    return EquipmentRepository.update(equipmentId, data);
  },

  async deactivate(clientId: string, equipmentId: string): Promise<Equipment> {
    const equipment = await EquipmentRepository.findById(equipmentId);
    if (!equipment || equipment.clientId !== clientId) {
      throw new AppError(404, 'Equipo no encontrado');
    }
    return EquipmentRepository.deactivate(equipmentId);
  },
};
