import { api } from './api';
import { ApiResponse } from '@/types';

export interface LatestBackup {
  result: 'SUCCESS' | 'WARNING' | 'FAILURE';
  occurredAt: string;
}

export interface ClientBackupStatus {
  clientId: string;
  clientName: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILURE' | null;
  occurredAt: string | null;
  taskName: string | null;
  startTime: string | null;
  endTime: string | null;
  dataSize: string | null;
  dataRead: string | null;
  dataTransferred: string | null;
  duration: string | null;
}

export interface FailedBackupClient {
  clientId: string;
  clientName: string;
  occurredAt: string;
  taskName: string;
}

export interface BackupJob {
  id: string;
  clientId: string | null;
  taskName: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILURE';
  occurredAt: string;
  rawSubject: string;
  createdAt: string;
  startTime: string | null;
  endTime: string | null;
  dataSize: string | null;
  dataRead: string | null;
  dataTransferred: string | null;
  duration: string | null;
}

export interface SyncResult {
  imported: number;
  skipped: number;
  rematched: number;
  unmatched: string[];
  syncRanAt: string;
}

export interface BackupStatus {
  lastSync: string | null;
  configured: boolean;
}

export const backupsService = {
  async listByClient(clientId: string, year?: number, month?: number): Promise<BackupJob[]> {
    const params: Record<string, number> = {};
    if (year !== undefined) params.year = year;
    if (month !== undefined) params.month = month;
    const { data } = await api.get<ApiResponse<BackupJob[]>>(`/clients/${clientId}/backups`, { params });
    return data.data;
  },

  async sync(): Promise<SyncResult> {
    const { data } = await api.post<ApiResponse<SyncResult>>('/backups/sync');
    return data.data;
  },

  async status(): Promise<BackupStatus> {
    const { data } = await api.get<ApiResponse<BackupStatus>>('/backups/status');
    return data.data;
  },

  async latestByClient(clientId: string): Promise<LatestBackup | null> {
    const { data } = await api.get<ApiResponse<LatestBackup | null>>(`/clients/${clientId}/backups/latest`);
    return data.data;
  },

  async failedClients(): Promise<FailedBackupClient[]> {
    const { data } = await api.get<ApiResponse<FailedBackupClient[]>>('/backups/failed-clients');
    return data.data;
  },

  async unmatchedNames(): Promise<string[]> {
    const { data } = await api.get<ApiResponse<string[]>>('/backups/unmatched-names');
    return data.data;
  },

  async allClientsStatus(): Promise<ClientBackupStatus[]> {
    const { data } = await api.get<ApiResponse<ClientBackupStatus[]>>('/backups/all-clients-status');
    return data.data;
  },
};
