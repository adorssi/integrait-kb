import { api } from './api';
import { ApiResponse, IncidentComment, Incident, IncidentStatus, Priority, Tag } from '@/types';

export interface IncidentFilters {
  clientId?: string;
  technicianId?: string;
  status?: IncidentStatus;
  priority?: Priority;
  equipmentId?: string;
}

export const incidentsService = {
  async list(filters?: IncidentFilters): Promise<Incident[]> {
    const { data } = await api.get<ApiResponse<Incident[]>>('/incidents', { params: filters });
    return data.data;
  },

  async getById(id: string): Promise<Incident> {
    const { data } = await api.get<ApiResponse<Incident>>(`/incidents/${id}`);
    return data.data;
  },

  async create(payload: {
    title: string; description: string; clientId: string;
    priority?: Priority; technicianId?: string; equipmentId?: string; tagIds?: string[];
  }): Promise<Incident> {
    const { data } = await api.post<ApiResponse<Incident>>('/incidents', payload);
    return data.data;
  },

  async update(id: string, payload: {
    title?: string; description?: string; priority?: Priority; tagIds?: string[];
  }): Promise<Incident> {
    const { data } = await api.put<ApiResponse<Incident>>(`/incidents/${id}`, payload);
    return data.data;
  },

  async changeStatus(id: string, status: IncidentStatus): Promise<Incident> {
    const { data } = await api.patch<ApiResponse<Incident>>(`/incidents/${id}/status`, { status });
    return data.data;
  },

  async assignTechnician(id: string, technicianId: string | null): Promise<Incident> {
    const { data } = await api.patch<ApiResponse<Incident>>(`/incidents/${id}/assign`, { technicianId });
    return data.data;
  },

  async registerSolution(id: string, payload: { description: string; timeSpentMinutes: number }): Promise<Incident> {
    const { data } = await api.post<ApiResponse<Incident>>(`/incidents/${id}/solution`, payload);
    return data.data;
  },

  async listTags(): Promise<Tag[]> {
    const { data } = await api.get<ApiResponse<Tag[]>>('/tags');
    return data.data;
  },

  async listComments(incidentId: string): Promise<IncidentComment[]> {
    const { data } = await api.get<ApiResponse<IncidentComment[]>>(`/incidents/${incidentId}/comments`);
    return data.data;
  },

  async createComment(incidentId: string, content: string): Promise<IncidentComment> {
    const { data } = await api.post<ApiResponse<IncidentComment>>(`/incidents/${incidentId}/comments`, { content });
    return data.data;
  },

  async deleteComment(incidentId: string, commentId: string): Promise<void> {
    await api.delete(`/incidents/${incidentId}/comments/${commentId}`);
  },
};
