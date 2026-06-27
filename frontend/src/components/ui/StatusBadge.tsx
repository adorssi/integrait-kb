import { cn } from '@/lib/utils';
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

const STATUS_CLASSES: Record<IncidentStatus, string> = {
  OPEN: 'border-priority-high/30 bg-priority-high/15 text-priority-high',
  IN_PROGRESS: 'border-priority-medium/30 bg-priority-medium/15 text-priority-medium',
  RESOLVED: 'border-priority-low/30 bg-priority-low/15 text-priority-low',
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  CRITICAL: 'border-priority-critical/30 bg-priority-critical/15 text-priority-critical',
  HIGH: 'border-priority-high/30 bg-priority-high/15 text-priority-high',
  MEDIUM: 'border-priority-medium/30 bg-priority-medium/15 text-priority-medium',
  LOW: 'border-priority-low/30 bg-priority-low/15 text-priority-low',
};

const BADGE_BASE = 'inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-medium';

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={cn(BADGE_BASE, STATUS_CLASSES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn(BADGE_BASE, PRIORITY_CLASSES[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export const PRIORITY_RAIL_CLASS: Record<Priority, string> = {
  CRITICAL: 'bg-priority-critical',
  HIGH: 'bg-priority-high',
  MEDIUM: 'bg-priority-medium',
  LOW: 'bg-priority-low',
};
