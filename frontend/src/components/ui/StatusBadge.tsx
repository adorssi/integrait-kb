import { Badge } from './badge';
import { IncidentStatus, Priority } from '@/types';

const STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  RESOLVED: 'Resuelto',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const variant = status === 'OPEN' ? 'warning' : status === 'IN_PROGRESS' ? 'default' : 'success';
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const variant = priority === 'CRITICAL' ? 'critical' : priority === 'HIGH' ? 'warning' : priority === 'MEDIUM' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{PRIORITY_LABELS[priority]}</Badge>;
}
