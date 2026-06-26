export type Role = 'TECHNICIAN' | 'ADMIN';
export type BackupResult = 'SUCCESS' | 'WARNING' | 'FAILURE';

// Objetos de runtime (valor + tipo en uno)
export const IncidentStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
} as const;
export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export const Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export interface Technician {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  city: string;
  rut: string;
  phone: string;
  notes?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Equipment {
  id: string;
  name: string;
  ip?: string | null;
  brand?: string | null;
  model?: string | null;
  location?: string | null;
  os?: string | null;
  active: boolean;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface IncidentComment {
  id: string;
  content: string;
  incidentId: string;
  technicianId: string;
  author: { id: string; name: string };
  createdAt: string;
}

export interface Solution {
  id: string;
  description: string;
  timeSpentMinutes: number;
  incidentId: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: Priority;
  clientId: string;
  client: { id: string; name: string };
  technicianId?: string | null;
  assignedTo?: { id: string; name: string } | null;
  equipmentId?: string | null;
  equipment?: { id: string; name: string } | null;
  solution?: Solution | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientDetail extends Client {
  equipment: Equipment[];
  contacts: Contact[];
  incidents: Incident[];
}

// Respuestas API
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: { field: string; message: string }[];
}

// Auth
export interface AuthResponse {
  token: string;
  technician: Technician;
}
