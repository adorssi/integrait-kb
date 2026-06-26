import { Contact } from '@prisma/client';
import { ContactRepository } from '../repositories/contact-repository';
import { ClientRepository } from '../repositories/client-repository';
import { ICreateContactDTO, IUpdateContactDTO } from '../models/types';
import { AppError } from '../middlewares/error-handler';

export const ContactService = {
  async listByClient(clientId: string): Promise<Contact[]> {
    const client = await ClientRepository.findById(clientId);
    if (!client) throw new AppError(404, 'Cliente no encontrado');
    return ContactRepository.findByClient(clientId);
  },

  async create(clientId: string, data: ICreateContactDTO): Promise<Contact> {
    const client = await ClientRepository.findById(clientId);
    if (!client || !client.active) throw new AppError(404, 'Cliente no encontrado');
    return ContactRepository.create(clientId, data);
  },

  async update(clientId: string, contactId: string, data: IUpdateContactDTO): Promise<Contact> {
    const contact = await ContactRepository.findById(contactId);
    if (!contact || contact.clientId !== clientId) {
      throw new AppError(404, 'Funcionario no encontrado');
    }
    return ContactRepository.update(contactId, data);
  },

  async delete(clientId: string, contactId: string): Promise<void> {
    const contact = await ContactRepository.findById(contactId);
    if (!contact || contact.clientId !== clientId) {
      throw new AppError(404, 'Funcionario no encontrado');
    }
    await ContactRepository.delete(contactId);
  },
};
