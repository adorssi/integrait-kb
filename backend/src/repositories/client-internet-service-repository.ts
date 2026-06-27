import { prisma } from '../utils/prisma';
import { ClientInternetService } from '@prisma/client';

export interface ICreateInternetServiceDTO {
  label?: string;
  ip?: string | null;
  dynamicIp?: boolean;
  isp?: string | null;
  serviceNumber?: string | null;
  phone?: string | null;
  titular?: string | null;
}

export interface IUpdateInternetServiceDTO extends ICreateInternetServiceDTO {}

export const ClientInternetServiceRepository = {
  async findByClient(clientId: string): Promise<ClientInternetService[]> {
    return prisma.clientInternetService.findMany({
      where: { clientId, active: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  async findById(id: string): Promise<ClientInternetService | null> {
    return prisma.clientInternetService.findUnique({ where: { id } });
  },

  async create(clientId: string, data: ICreateInternetServiceDTO): Promise<ClientInternetService> {
    return prisma.clientInternetService.create({ data: { ...data, clientId } });
  },

  async update(id: string, data: IUpdateInternetServiceDTO): Promise<ClientInternetService> {
    return prisma.clientInternetService.update({ where: { id }, data });
  },

  async deactivate(id: string): Promise<ClientInternetService> {
    return prisma.clientInternetService.update({ where: { id }, data: { active: false } });
  },
};
