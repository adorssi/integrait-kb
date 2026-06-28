import bcrypt from 'bcrypt';
import { TechnicianRepository } from '../repositories/technician-repository';
import { ICreateTechnicianDTO, IUpdateTechnicianDTO } from '../models/types';
import { AppError } from '../middlewares/error-handler';
import { toPublic, TechnicianPublic } from '../utils/technician-utils';

const BCRYPT_ROUNDS = 12;

export const TechnicianService = {
  async list(): Promise<TechnicianPublic[]> {
    const technicians = await TechnicianRepository.findAll();
    return technicians.map(toPublic);
  },

  async getById(id: string): Promise<TechnicianPublic> {
    const technician = await TechnicianRepository.findById(id);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');
    return toPublic(technician);
  },

  async create(data: ICreateTechnicianDTO): Promise<TechnicianPublic> {
    const existing = await TechnicianRepository.findByEmail(data.email);
    if (existing) throw new AppError(409, 'Ya existe un técnico con ese email');

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const { password: _, ...rest } = data;
    const technician = await TechnicianRepository.create({ ...rest, passwordHash });
    return toPublic(technician);
  },

  /**
   * Actualiza datos del técnico. Si se envía password, se hashea.
   * No permite cambiar el propio rol del técnico autenticado.
   */
  async update(id: string, data: IUpdateTechnicianDTO, requesterId: string): Promise<TechnicianPublic> {
    const technician = await TechnicianRepository.findById(id);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');

    if (data.email && data.email !== technician.email) {
      const existing = await TechnicianRepository.findByEmail(data.email);
      if (existing) throw new AppError(409, 'Ya existe un técnico con ese email');
    }

    const { password, ...rest } = data;
    const updateData: Parameters<typeof TechnicianRepository.update>[1] = { ...rest };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    const updated = await TechnicianRepository.update(id, updateData);
    return toPublic(updated);
  },

  async deactivate(id: string, requesterId: string): Promise<TechnicianPublic> {
    if (id === requesterId) {
      throw new AppError(400, 'No podés desactivar tu propia cuenta');
    }
    const technician = await TechnicianRepository.findById(id);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');

    const updated = await TechnicianRepository.deactivate(id);
    return toPublic(updated);
  },

  async activate(id: string): Promise<TechnicianPublic> {
    const technician = await TechnicianRepository.findById(id);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');

    const updated = await TechnicianRepository.activate(id);
    return toPublic(updated);
  },

  /** Activa o desactiva la exigencia de 2FA para un técnico */
  async requireTotp(id: string, required: boolean): Promise<TechnicianPublic> {
    const technician = await TechnicianRepository.findById(id);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');
    await TechnicianRepository.setTotpRequired(id, required);
    const updated = await TechnicianRepository.findById(id);
    return toPublic(updated!);
  },

  /** Desbloquea una cuenta: resetea intentos fallidos y elimina lockedUntil */
  async unlock(id: string, requesterId: string): Promise<TechnicianPublic> {
    if (id === requesterId) {
      throw new AppError(400, 'No podés desbloquear tu propia cuenta por este medio');
    }
    const technician = await TechnicianRepository.findById(id);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');

    await TechnicianRepository.resetFailedAttempts(id);
    const updated = await TechnicianRepository.findById(id);
    return toPublic(updated!);
  },
};
