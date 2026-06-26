import { prisma } from '../utils/prisma';
import { Contact } from '@prisma/client';
import { ICreateContactDTO, IUpdateContactDTO } from '../models/types';

export const ContactRepository = {
  async findByClient(clientId: string): Promise<Contact[]> {
    return prisma.contact.findMany({
      where: { clientId },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string): Promise<Contact | null> {
    return prisma.contact.findUnique({ where: { id } });
  },

  async create(clientId: string, data: ICreateContactDTO): Promise<Contact> {
    return prisma.contact.create({ data: { ...data, clientId } });
  },

  async update(id: string, data: IUpdateContactDTO): Promise<Contact> {
    return prisma.contact.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.contact.delete({ where: { id } });
  },
};
