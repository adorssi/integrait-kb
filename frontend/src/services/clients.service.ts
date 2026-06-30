import { api } from './api';
import {
  ApiResponse, Client, ClientDetail, Equipment, Contact,
  ClientCredential, ClientWifi, ClientDocument, ClientInternetService,
} from '@/types';

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
    servicePlan?: string | null;
    contractStart?: string | null;
    contractEnd?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
    hasBranches?: boolean;
    hasCameras?: boolean;
    hasBackups?: boolean;
  }): Promise<Client> {
    const { data } = await api.patch<ApiResponse<Client>>(`/clients/${id}/infrastructure`, payload);
    return data.data;
  },

  async deactivate(id: string): Promise<Client> {
    const { data } = await api.patch<ApiResponse<Client>>(`/clients/${id}/deactivate`);
    return data.data;
  },

  async reactivate(id: string): Promise<Client> {
    const { data } = await api.patch<ApiResponse<Client>>(`/clients/${id}/reactivate`);
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

  // Credenciales genéricas
  async listCredentials(clientId: string): Promise<ClientCredential[]> {
    const { data } = await api.get<ApiResponse<ClientCredential[]>>(`/clients/${clientId}/credentials`);
    return data.data;
  },

  async createCredential(clientId: string, payload: { service: string; username?: string; password?: string; notes?: string }): Promise<ClientCredential> {
    const { data } = await api.post<ApiResponse<ClientCredential>>(`/clients/${clientId}/credentials`, payload);
    return data.data;
  },

  async updateCredential(clientId: string, credId: string, payload: { service?: string; username?: string | null; password?: string | null; notes?: string | null }): Promise<ClientCredential> {
    const { data } = await api.put<ApiResponse<ClientCredential>>(`/clients/${clientId}/credentials/${credId}`, payload);
    return data.data;
  },

  async getCredentialPassword(clientId: string, credId: string): Promise<{ password: string | null }> {
    const { data } = await api.get<ApiResponse<{ password: string | null }>>(`/clients/${clientId}/credentials/${credId}/password`);
    return data.data;
  },

  async deleteCredential(clientId: string, credId: string): Promise<void> {
    await api.delete(`/clients/${clientId}/credentials/${credId}`);
  },

  // WiFi
  async listWifi(clientId: string): Promise<ClientWifi[]> {
    const { data } = await api.get<ApiResponse<ClientWifi[]>>(`/clients/${clientId}/wifi`);
    return data.data;
  },

  async createWifi(clientId: string, payload: { ssid: string; password?: string; location?: string; notes?: string }): Promise<ClientWifi> {
    const { data } = await api.post<ApiResponse<ClientWifi>>(`/clients/${clientId}/wifi`, payload);
    return data.data;
  },

  async updateWifi(clientId: string, wifiId: string, payload: { ssid?: string; password?: string | null; location?: string | null; notes?: string | null }): Promise<ClientWifi> {
    const { data } = await api.put<ApiResponse<ClientWifi>>(`/clients/${clientId}/wifi/${wifiId}`, payload);
    return data.data;
  },

  async getWifiPassword(clientId: string, wifiId: string): Promise<{ password: string | null }> {
    const { data } = await api.get<ApiResponse<{ password: string | null }>>(`/clients/${clientId}/wifi/${wifiId}/password`);
    return data.data;
  },

  async deleteWifi(clientId: string, wifiId: string): Promise<void> {
    await api.delete(`/clients/${clientId}/wifi/${wifiId}`);
  },

  // Documentos
  async listDocuments(clientId: string): Promise<ClientDocument[]> {
    const { data } = await api.get<ApiResponse<ClientDocument[]>>(`/clients/${clientId}/documents`);
    return data.data;
  },

  async uploadDocument(clientId: string, file: File, displayName?: string): Promise<ClientDocument> {
    const form = new FormData();
    form.append('file', file);
    if (displayName) form.append('displayName', displayName);
    const { data } = await api.post<ApiResponse<ClientDocument>>(`/clients/${clientId}/documents`, form);
    return data.data;
  },

  async deleteDocument(clientId: string, docId: string): Promise<void> {
    await api.delete(`/clients/${clientId}/documents/${docId}`);
  },

  getDocumentDownloadUrl(clientId: string, docId: string): string {
    return `/api/clients/${clientId}/documents/${docId}/download`;
  },

  // Servicios de internet
  async listInternetServices(clientId: string): Promise<ClientInternetService[]> {
    const { data } = await api.get<ApiResponse<ClientInternetService[]>>(`/clients/${clientId}/internet-services`);
    return data.data;
  },

  async createInternetService(clientId: string, payload: {
    label?: string; ip?: string | null; dynamicIp?: boolean;
    isp?: string | null; serviceNumber?: string | null; phone?: string | null; titular?: string | null;
  }): Promise<ClientInternetService> {
    const { data } = await api.post<ApiResponse<ClientInternetService>>(`/clients/${clientId}/internet-services`, payload);
    return data.data;
  },

  async updateInternetService(clientId: string, serviceId: string, payload: {
    label?: string; ip?: string | null; dynamicIp?: boolean;
    isp?: string | null; serviceNumber?: string | null; phone?: string | null; titular?: string | null;
  }): Promise<ClientInternetService> {
    const { data } = await api.put<ApiResponse<ClientInternetService>>(`/clients/${clientId}/internet-services/${serviceId}`, payload);
    return data.data;
  },

  async deleteInternetService(clientId: string, serviceId: string): Promise<void> {
    await api.delete(`/clients/${clientId}/internet-services/${serviceId}`);
  },
};
