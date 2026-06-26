import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { backupsService } from '@/services/backups.service';
import { formatDateTime } from '@/lib/utils';

const STAT_CARDS = [
  { label: 'Incidentes abiertos', value: '—', icon: AlertCircle, color: 'text-yellow-500' },
  { label: 'En progreso', value: '—', icon: AlertCircle, color: 'text-blue-500' },
  { label: 'Resueltos hoy', value: '—', icon: CheckCircle2, color: 'text-green-500' },
  { label: 'Clientes activos', value: '—', icon: Building2, color: 'text-primary' },
];

export function DashboardPage() {
  const { technician } = useAuth();
  const navigate = useNavigate();

  const { data: failedClients = [], isLoading: loadingFailed } = useQuery({
    queryKey: ['backup-failed-clients'],
    queryFn: backupsService.failedClients,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bienvenido, {technician?.name}</h1>
        <p className="text-muted-foreground">Resumen del sistema</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Backups fallidos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Backups fallidos
          </CardTitle>
          {!loadingFailed && (
            <Badge variant={failedClients.length > 0 ? 'destructive' : 'success'}>
              {failedClients.length > 0 ? `${failedClients.length} cliente${failedClients.length > 1 ? 's' : ''}` : 'Todo OK'}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {loadingFailed ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : failedClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ningún cliente tiene el último backup registrado en estado fallido.
            </p>
          ) : (
            <div className="divide-y">
              {failedClients.map((c) => (
                <div
                  key={c.clientId}
                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
                  onClick={() => navigate(`/clients/${c.clientId}?tab=backups`)}
                >
                  <div>
                    <p className="text-sm font-medium">{c.clientName}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs">{c.taskName}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
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
