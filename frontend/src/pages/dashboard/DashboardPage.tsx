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

function BackupDot({ result }: { result: 'SUCCESS' | 'WARNING' | 'FAILURE' | null }) {
  if (result === 'SUCCESS') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" title="OK" />;
  if (result === 'WARNING') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" title="Advertencia" />;
  if (result === 'FAILURE') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" title="Fallido" />;
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30" title="Sin datos" />;
}

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

  const { data: allClientsStatus = [], isLoading: loadingAll } = useQuery({
    queryKey: ['backup-all-clients-status'],
    queryFn: backupsService.allClientsStatus,
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

      {/* Estado de backups por cliente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Estado de backups
          </CardTitle>
          <div className="flex items-center gap-3">
            {backupStatus?.lastSync && (
              <span className="text-xs text-muted-foreground">
                Última sync: {formatDateTime(backupStatus.lastSync)}
              </span>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> OK</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-400" /> Advertencia</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Fallido</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" /> Sin datos</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingAll ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">Cargando...</p>
          ) : allClientsStatus.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No hay clientes registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground w-8"></th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Cliente</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Último backup</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allClientsStatus.map((c) => (
                  <tr
                    key={c.clientId}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/clients/${c.clientId}?tab=backups`)}
                  >
                    <td className="px-4 py-2.5">
                      <BackupDot result={c.result} />
                    </td>
                    <td className="px-4 py-2.5 font-medium">{c.clientName}</td>
                    <td className="px-4 py-2.5">
                      {c.result === 'SUCCESS' && <Badge variant="success">OK</Badge>}
                      {c.result === 'WARNING' && <Badge variant="warning">Advertencia</Badge>}
                      {c.result === 'FAILURE' && <Badge variant="destructive">Fallido</Badge>}
                      {!c.result && <Badge variant="outline">Sin datos</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {c.occurredAt ? formatDateTime(c.occurredAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Backups fallidos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Backups fallidos
          </CardTitle>
          {!loadingFailed && (
            <Badge variant={failedClients.length > 0 ? 'destructive' : 'success'}>
              {failedClients.length > 0 ? `${failedClients.length} cliente${failedClients.length > 1 ? 's' : ''}` : 'Backups OK'}
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
