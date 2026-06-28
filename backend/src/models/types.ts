import type { TechnicianPublic } from '../utils/technician-utils';
export type { TechnicianPublic };

// Enums — espejo de los enums de Prisma para uso en la capa de aplicación
export enum Role {
  TECHNICIAN = 'TECHNICIAN',
  ADMIN = 'ADMIN',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum BackupResult {
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  FAILURE = 'FAILURE',
}

// Interfaces de dominio
export interface IClient {
  id: string;
  name: string;
  city: string;
  rut?: string | null;
  phone?: string | null;
  contact?: string | null;
  notes?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEquipment {
  id: string;
  name: string;
  ip?: string | null;
  brand?: string | null;
  model?: string | null;
  location?: string | null;
  os?: string | null;
  active: boolean;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBackupJob {
  id: string;
  clientId: string;
  taskName: string;
  result: BackupResult;
  occurredAt: Date;
  rawSubject: string;
  createdAt: Date;
}

export interface ITechnician {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITag {
  id: string;
  name: string;
}

export interface ISolution {
  id: string;
  description: string;
  timeSpentMinutes: number;
  incidentId: string;
  createdAt: Date;
}

export interface IIncident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: Priority;
  clientId: string;
  technicianId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs de creación y actualización
export interface ICreateClientDTO {
  name: string;
  city: string;
  rut?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  servicePlan?: string | null;
  contractStart?: Date | null;
  contractEnd?: Date | null;
}

export interface IUpdateClientDTO {
  name?: string;
  city?: string;
  rut?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  publicIp?: string | null;
  isp?: string | null;
  networkRange?: string | null;
  servicePlan?: string | null;
  contractStart?: Date | null;
  contractEnd?: Date | null;
}

export interface ICreateEquipmentDTO {
  name: string;
  ip?: string;
  brand?: string;
  model?: string;
  location?: string;
  os?: string;
  notes?: string;
  encryptedUsername?: string;
  encryptedPassword?: string;
  branchId?: string | null;
}

export interface IUpdateEquipmentDTO {
  name?: string;
  ip?: string;
  brand?: string;
  model?: string;
  location?: string;
  os?: string;
  notes?: string;
  encryptedUsername?: string | null;
  encryptedPassword?: string | null;
  branchId?: string | null;
}

export interface IEquipmentCredentials {
  username: string | null;
  password: string | null;
}

export interface ICreateContactDTO {
  name: string;
  email?: string;
  phone?: string;
}

export interface IUpdateContactDTO {
  name?: string;
  email?: string;
  phone?: string;
}

export interface IClientFilters {
  search?: string;
  active?: boolean;
}

export interface ICreateTechnicianDTO {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface IUpdateTechnicianDTO {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

export interface ICreateIncidentDTO {
  title: string;
  description: string;
  clientId: string;
  priority?: Priority;
  technicianId?: string;
  equipmentId?: string;
  tagIds?: string[];
}

export interface IUpdateIncidentDTO {
  title?: string;
  description?: string;
  priority?: Priority;
  tagIds?: string[];
}

export interface ICreateSolutionDTO {
  description: string;
  timeSpentMinutes: number;
}

// Auth
export interface IAuthPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface ILoginDTO {
  email: string;
  password: string;
}

export interface IAuthResponse {
  token: string;
  technician: TechnicianPublic;
}

// Respuestas API genéricas
export interface IApiResponse<T> {
  data: T;
  message?: string;
}

export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Filtros para incidentes
export interface IIncidentFilters {
  clientId?: string;
  technicianId?: string;
  status?: IncidentStatus;
  priority?: Priority;
  equipmentId?: string;
}
