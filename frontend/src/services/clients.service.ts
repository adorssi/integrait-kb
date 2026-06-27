import { api } from './api';
import { ApiResponse, Client, ClientDetail, Equipment, Contact } from '@/types';

export const clientsService = {
  async list(search?: string): Promise<Client[]> {
    const { data } = await api.get<ApiResponse<Client[]>>('/clients', { params: { search } });
    return data.data;
  },

  async getById(id: string): Promise<Client> {
    const { data } = await api.get<ApiResponse<Client>>(`/clients/${id}`);
    return data.data;
  },

  async getDetail(id: string): Promise<ClientDetail> {
    const { data } = await api.get<ApiResponse<ClientDetail>>(`/clients/${id}/detail`);
    return data.data;
  },

  async create(payload: Omit<Client, 'id' | 'active' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const { data } = await api.post<ApiResponse<Client>>('/clients', payload);
    return data.data;
  },

  async update(id: string, payload: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Client> {
    const { data } = await api.put<ApiResponse<Client>>(`/clients/${id}`, payload);
    return data.data;
  },

  async updateInfrastructure(id: string, payload: {
    publicIp?: string | null;
    isp?: string | null;
    networkRange?: string | null;
    servicePlan?: string | null;
    contractStart?: string | null;
    contractEnd?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
  }): Promise<Client> {
    const { data } = await api.patch<ApiResponse<Client>>(`/clients/${id}/infrastructure`, payload);
    return data.data;
  },

  async deactivate(id: string): Promise<Client> {
    const { data } = await api.patch<ApiResponse<Client>>(`/clients/${id}/deactivate`);
    return data.data;
  },

  // Equipos
  async listEquipment(clientId: string): Promise<Equipment[]> {
    const { data } = await api.get<ApiResponse<Equipment[]>>(`/clients/${clientId}/equipment`);
    return data.data;
  },

  async createEquipment(clientId: string, payload: Partial<Equipment> & { username?: string; password?: string }): Promise<Equipment> {
    const { data } = await api.post<ApiResponse<Equipment>>(`/clients/${clientId}/equipment`, payload);
    return data.data;
  },

  async updateEquipment(clientId: string, equipmentId: string, payload: Partial<Equipment> & { username?: string | null; password?: string | null }): Promise<Equipment> {
    const { data } = await api.put<ApiResponse<Equipment>>(`/clients/${clientId}/equipment/${equipmentId}`, payload);
    return data.data;
  },

  async deactivateEquipment(clientId: string, equipmentId: string): Promise<Equipment> {
    const { data } = await api.patch<ApiResponse<Equipment>>(`/clients/${clientId}/equipment/${equipmentId}/deactivate`);
    return data.data;
  },

  async getEquipmentCredentials(clientId: string, equipmentId: string): Promise<{ username: string | null; password: string | null }> {
    const { data } = await api.get<ApiResponse<{ username: string | null; password: string | null }>>(`/clients/${clientId}/equipment/${equipmentId}/credentials`);
    return data.data;
  },

  // Funcionarios
  async listContacts(clientId: string): Promise<Contact[]> {
    const { data } = await api.get<ApiResponse<Contact[]>>(`/clients/${clientId}/contacts`);
    return data.data;
  },

  async createContact(clientId: string, payload: Partial<Contact>): Promise<Contact> {
    const { data } = await api.post<ApiResponse<Contact>>(`/clients/${clientId}/contacts`, payload);
    return data.data;
  },

  async updateContact(clientId: string, contactId: string, payload: Partial<Contact>): Promise<Contact> {
    const { data } = await api.put<ApiResponse<Contact>>(`/clients/${clientId}/contacts/${contactId}`, payload);
    return data.data;
  },

  async deleteContact(clientId: string, contactId: string): Promise<void> {
    await api.delete(`/clients/${clientId}/contacts/${contactId}`);
  },
};
