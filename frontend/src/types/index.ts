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
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  city: string;
  rut: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  servicePlan?: string | null;
  hasBranches: boolean;
  hasCameras: boolean;
  hasBackups: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientInternetService {
  id: string;
  clientId: string;
  label: string;
  ip?: string | null;
  dynamicIp: boolean;
  isp?: string | null;
  serviceNumber?: string | null;
  phone?: string | null;
  titular?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NVR {
  id: string;
  clientId: string;
  name: string;
  ip: string;
  port?: number | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  verificationCode?: string | null;
  channels?: number | null;
  notes?: string | null;
  hasCredentials?: boolean;
  active: boolean;
  cameras: Camera[];
  createdAt: string;
  updatedAt: string;
}

export interface Camera {
  id: string;
  clientId: string;
  nvrId?: string | null;
  nvr?: { id: string; name: string } | null;
  name: string;
  ip?: string | null;
  channel?: number | null;
  location?: string | null;
  brand?: string | null;
  model?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Credentials {
  username: string | null;
  password: string | null;
}

export interface Equipment {
  id: string;
  name: string;
  ip?: string | null;
  brand?: string | null;
  model?: string | null;
  location?: string | null;
  os?: string | null;
  notes?: string | null;
  hasCredentials: boolean;
  active: boolean;
  clientId: string;
  branchId?: string | null;
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

export interface IncidentAttachment {
  id: string;
  incidentId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
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

export interface NetworkSegment {
  id: string;
  branchId: string;
  vlan?: number | null;
  networkRange: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  clientId: string;
  name: string;
  address?: string | null;
  publicIp?: string | null;
  dynamicIp: boolean;
  isp?: string | null;
  active: boolean;
  segments: NetworkSegment[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientCredential {
  id: string;
  clientId: string;
  service: string;
  username?: string | null;
  hasPassword: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientWifi {
  id: string;
  clientId: string;
  ssid: string;
  hasPassword: boolean;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface ImportResult {
  imported: number;
  errors: { row: number; message: string }[];
}

export interface ClientDetail extends Client {
  equipment: Equipment[];
  contacts: Contact[];
  incidents: Incident[];
  nvrs?: NVR[];
  branches: Branch[];
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
