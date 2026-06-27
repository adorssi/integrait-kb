import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Building2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { backupsService } from '@/services/backups.service';
import { formatDateTime } from '@/lib/utils';

const STAT_CARDS = [
  {
    label: 'Incidentes abiertos',
    value: '—',
    icon: AlertCircle,
    railClass: 'bg-priority-high',
    valueClass: 'text-priority-high',
  },
  {
    label: 'En progreso',
    value: '—',
    icon: Clock,
    railClass: 'bg-priority-medium',
    valueClass: 'text-priority-medium',
  },
  {
    label: 'Resueltos hoy',
    value: '—',
    icon: CheckCircle2,
    railClass: 'bg-priority-low',
    valueClass: 'text-priority-low',
  },
  {
    label: 'Clientes activos',
    value: '—',
    icon: Building2,
    railClass: 'bg-primary',
    valueClass: 'text-primary',
  },
];

export function DashboardPage() {
  const { technician } = useAuth();
  const navigate = useNavigate();

  const { data: failedClients = [], isLoading: loadingFailed } = useQuery({
    queryKey: ['backup-failed-clients'],
    queryFn: backupsService.failedClients,
    staleTime: 5 * 60 * 1000,
  });

  const { data: backupStatus } = useQuery({
    queryKey: ['backup-status'],
    queryFn: backupsService.status,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold">
          Hola, {technician?.name.split(' ')[0]}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Resumen del sistema</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, railClass, valueClass }) => (
          <Card key={label} className="overflow-hidden">
            <div className="flex">
              <div className={`w-1 shrink-0 ${railClass}`} />
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <Icon className={`h-4 w-4 ${valueClass} opacity-70`} />
                </div>
                <p className={`mt-2 font-mono text-2xl font-semibold ${valueClass}`}>{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Backups fallidos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <XCircle className="h-4 w-4 text-priority-critical" />
              Backups fallidos
            </CardTitle>
            <div className="flex items-center gap-3">
              {backupStatus?.lastSync && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  Última sync: {formatDateTime(backupStatus.lastSync)}
                </span>
              )}
              {!loadingFailed && (
                <Badge variant={failedClients.length > 0 ? 'critical' : 'success'}>
                  {failedClients.length > 0
                    ? `${failedClients.length} cliente${failedClients.length > 1 ? 's' : ''}`
                    : 'Backups OK'}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingFailed ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : failedClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ningún cliente tiene el último backup registrado en estado fallido.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {failedClients.map((c) => (
                <div
                  key={c.clientId}
                  className="-mx-2 flex cursor-pointer items-center justify-between rounded px-2 py-2.5 transition-colors hover:bg-accent"
                  onClick={() => navigate(`/clients/${c.clientId}?tab=backups`)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.clientName}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{c.taskName}</p>
                  </div>
                  <span className="ml-4 shrink-0 font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(c.occurredAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
