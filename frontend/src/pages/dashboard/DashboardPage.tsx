import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Building2, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { backupsService, ClientBackupStatus } from '@/services/backups.service';
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

function DetailCell({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="font-mono text-xs font-medium">{value}</span>
    </div>
  );
}

function BackupDetailPanel({ c }: { c: ClientBackupStatus }) {
  const hasDetails = c.startTime || c.endTime || c.dataSize || c.dataRead || c.dataTransferred || c.duration;

  return (
    <div className="bg-muted/30 border-t px-4 py-3 space-y-2">
      {c.taskName && (
        <p className="text-xs font-medium text-muted-foreground">
          Tarea: <span className="text-foreground font-semibold">{c.taskName}</span>
        </p>
      )}
      {hasDetails ? (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <DetailCell label="Inicio"       value={c.startTime} />
          <DetailCell label="Fin"          value={c.endTime} />
          <DetailCell label="Duración"     value={c.duration} />
          <DetailCell label="Tamaño"       value={c.dataSize} />
          <DetailCell label="Leído"        value={c.dataRead} />
          <DetailCell label="Transferido"  value={c.dataTransferred} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Sin detalles disponibles — se poblarán en la próxima sincronización.
        </p>
      )}
      {c.jobMessage && (() => {
        const isError = c.result === 'FAILURE';
        const isWarn  = c.result === 'WARNING';
        return (
          <div className={`mt-1 rounded-md border px-3 py-2 space-y-0.5 ${
            isError ? 'border-destructive/30 bg-destructive/5'
            : isWarn ? 'border-yellow-400/30 bg-yellow-400/5'
            : 'border-border bg-muted/40'
          }`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              isError ? 'text-destructive'
              : isWarn ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-muted-foreground'
            }`}>
              {isError ? 'Motivo del fallo' : isWarn ? 'Advertencia' : 'Mensaje'}
            </span>
            <p className={`text-xs whitespace-pre-line leading-relaxed ${
              isError ? 'text-destructive/90'
              : isWarn ? 'text-yellow-700 dark:text-yellow-300'
              : 'text-foreground'
            }`}>
              {c.jobMessage}
            </p>
          </div>
        );
      })()}
    </div>
  );
}

export function DashboardPage() {
  const { technician } = useAuth();
  const navigate = useNavigate();
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

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

  const toggle = (clientId: string) =>
    setExpandedClientId((prev) => (prev === clientId ? null : clientId));

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
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3 flex-wrap">
            Estado de backups
            {backupStatus?.lastSync && (
              <span className="text-xs font-normal text-muted-foreground">
                Última sync: {formatDateTime(backupStatus.lastSync)}
              </span>
            )}
          </CardTitle>
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
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground w-6"></th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Cliente</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Último backup</th>
                </tr>
              </thead>
              <tbody>
                {allClientsStatus.map((c) => {
                  const isExpanded = expandedClientId === c.clientId;
                  return (
                    <>
                      <tr
                        key={c.clientId}
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer select-none"
                        onClick={() => toggle(c.clientId)}
                      >
                        <td className="px-4 py-2.5">
                          <BackupDot result={c.result} />
                        </td>
                        <td className="px-2 py-2.5 text-muted-foreground">
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </td>
                        <td className="px-4 py-2.5 font-medium">
                          <button
                            type="button"
                            className="hover:underline text-left"
                            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${c.clientId}?tab=backups`); }}
                          >
                            {c.clientName}
                          </button>
                        </td>
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
                      {isExpanded && (
                        <tr key={`${c.clientId}-detail`} className="border-b">
                          <td colSpan={5} className="p-0">
                            <BackupDetailPanel c={c} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
