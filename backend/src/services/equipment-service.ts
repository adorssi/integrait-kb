import { Equipment } from '@prisma/client';
import { EquipmentRepository } from '../repositories/equipment-repository';
import { ClientRepository } from '../repositories/client-repository';
import { ICreateEquipmentDTO, IUpdateEquipmentDTO, IEquipmentCredentials } from '../models/types';
import { AppError } from '../middlewares/error-handler';
import { encrypt, decrypt } from '../utils/encryption';

export const EquipmentService = {
  async listByClient(clientId: string) {
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

  async getCredentials(clientId: string, equipmentId: string): Promise<IEquipmentCredentials> {
    const raw = await EquipmentRepository.findById(equipmentId);
    if (!raw || raw.clientId !== clientId) throw new AppError(404, 'Equipo no encontrado');
    return {
      username: raw.encryptedUsername ? decrypt(raw.encryptedUsername) : null,
      password: raw.encryptedPassword ? decrypt(raw.encryptedPassword) : null,
    };
  },

  async create(clientId: string, data: ICreateEquipmentDTO & { username?: string; password?: string }) {
    const client = await ClientRepository.findById(clientId);
    if (!client || !client.active) throw new AppError(404, 'Cliente no encontrado');
    const { username, password, ...rest } = data;
    return EquipmentRepository.create(clientId, {
      ...rest,
      encryptedUsername: username ? encrypt(username) : undefined,
      encryptedPassword: password ? encrypt(password) : undefined,
    });
  },

  async update(clientId: string, equipmentId: string, data: IUpdateEquipmentDTO & { username?: string | null; password?: string | null }) {
    const equipment = await EquipmentRepository.findById(equipmentId);
    if (!equipment || equipment.clientId !== clientId) {
      throw new AppError(404, 'Equipo no encontrado');
    }
    const { username, password, ...rest } = data;
    const credentialUpdates: { encryptedUsername?: string | null; encryptedPassword?: string | null } = {};
    if (username !== undefined) {
      credentialUpdates.encryptedUsername = username ? encrypt(username) : null;
    }
    if (password !== undefined) {
      credentialUpdates.encryptedPassword = password ? encrypt(password) : null;
    }
    return EquipmentRepository.update(equipmentId, { ...rest, ...credentialUpdates });
  },

  async deactivate(clientId: string, equipmentId: string): Promise<Equipment> {
    const equipment = await EquipmentRepository.findById(equipmentId);
    if (!equipment || equipment.clientId !== clientId) {
      throw new AppError(404, 'Equipo no encontrado');
    }
    return EquipmentRepository.deactivate(equipmentId);
  },
};
