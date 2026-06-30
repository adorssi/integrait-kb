import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw, Loader2, AlertTriangle, Info } from 'lucide-react';
import { backupsService, BackupJob } from '@/services/backups.service';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

interface Props {
  clientId: string;
}

type DayResult = 'SUCCESS' | 'WARNING' | 'FAILURE' | null;

function worstResult(jobs: BackupJob[]): DayResult {
  if (jobs.length === 0) return null;
  if (jobs.some((j) => j.result === 'FAILURE')) return 'FAILURE';
  if (jobs.some((j) => j.result === 'WARNING')) return 'WARNING';
  return 'SUCCESS';
}

const RESULT_STYLES: Record<'SUCCESS' | 'WARNING' | 'FAILURE', string> = {
  SUCCESS: 'bg-green-500 text-white',
  WARNING: 'bg-yellow-400 text-yellow-900',
  FAILURE: 'bg-red-500 text-white',
};

const RESULT_LABEL: Record<'SUCCESS' | 'WARNING' | 'FAILURE', string> = {
  SUCCESS: 'OK',
  WARNING: 'Warning',
  FAILURE: 'Fallo',
};

const DOT_COLORS: Record<'SUCCESS' | 'WARNING' | 'FAILURE', string> = {
  SUCCESS: 'bg-green-500',
  WARNING: 'bg-yellow-400',
  FAILURE: 'bg-red-500',
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

type ListFilter = '7d' | '30d' | 'date';

// Formatea una fecha como YYYY-MM-DD en zona local
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function JobMessageBlock({ job }: { job: BackupJob }) {
  if (!job.jobMessage) return null;
  const isError = job.result === 'FAILURE';
  const isWarn = job.result === 'WARNING';
  return (
    <div className={`mt-1.5 rounded border px-2.5 py-1.5 ${
      isError ? 'border-destructive/30 bg-destructive/5'
      : isWarn ? 'border-yellow-400/30 bg-yellow-400/5'
      : 'border-border bg-muted/40'
    }`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${
        isError ? 'text-destructive' : isWarn ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'
      }`}>
        {isError ? 'Motivo del fallo' : isWarn ? 'Advertencia' : 'Mensaje'}
      </p>
      <p className={`text-xs whitespace-pre-line leading-relaxed ${
        isError ? 'text-destructive/90' : isWarn ? 'text-yellow-700 dark:text-yellow-300' : 'text-foreground'
      }`}>
        {job.jobMessage}
      </p>
    </div>
  );
}

function JobDetailGrid({ job }: { job: BackupJob }) {
  const cells: { label: string; value: string | null }[] = [
    { label: 'Inicio', value: job.startTime },
    { label: 'Fin', value: job.endTime },
    { label: 'Duración', value: job.duration },
    { label: 'Tamaño', value: job.dataSize },
    { label: 'Leído', value: job.dataRead },
    { label: 'Transferido', value: job.dataTransferred },
  ].filter((c) => c.value !== null);

  if (cells.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-1.5">
      {cells.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
          <span className="font-mono text-xs font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function BackupCalendar({ clientId }: Props) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Filtros de la lista
  const [listFilter, setListFilter] = useState<ListFilter>('7d');
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateStr(now));

  const { data: calJobs = [], isLoading } = useQuery({
    queryKey: ['backups', clientId, year, month],
    queryFn: () => backupsService.listByClient(clientId, year, month),
  });

  // Todos los jobs (sin filtro de mes) para la lista
  const { data: allJobs = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['backups-all', clientId],
    queryFn: () => backupsService.listByClient(clientId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: status } = useQuery({
    queryKey: ['backup-status'],
    queryFn: backupsService.status,
  });

  const { data: unmatchedNames = [] } = useQuery({
    queryKey: ['backup-unmatched-names'],
    queryFn: backupsService.unmatchedNames,
    enabled: isAdmin,
  });

  const syncMutation = useMutation({
    mutationFn: backupsService.sync,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backups', clientId] });
      qc.invalidateQueries({ queryKey: ['backups-all', clientId] });
      qc.invalidateQueries({ queryKey: ['backup-status'] });
      qc.invalidateQueries({ queryKey: ['backup-unmatched-names'] });
    },
  });

  // Jobs del calendario agrupados por día
  const jobsByDay = useMemo(() => {
    const map = new Map<number, BackupJob[]>();
    for (const job of calJobs) {
      const d = new Date(job.occurredAt).getDate();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(job);
    }
    return map;
  }, [calJobs]);

  // Grilla del mes
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  // Jobs filtrados para la lista
  const filteredJobs = useMemo(() => {
    const sorted = [...allJobs].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
    if (listFilter === '7d') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      return sorted.filter((j) => new Date(j.occurredAt) >= cutoff);
    }
    if (listFilter === '30d') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      return sorted.filter((j) => new Date(j.occurredAt) >= cutoff);
    }
    // Fecha específica
    return sorted.filter((j) => toLocalDateStr(new Date(j.occurredAt)) === selectedDate);
  }, [allJobs, listFilter, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header: navegación + sync */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold w-36 text-center text-sm">{MONTHS[month - 1]} {year}</span>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(syncMutation.data?.syncRanAt ?? status?.lastSync) && (
            <span className="text-xs text-muted-foreground">
              Última sync: {formatDateTime(syncMutation.data?.syncRanAt ?? status!.lastSync!)}
            </span>
          )}
          {!status?.configured && (
            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400 gap-1">
              <AlertTriangle className="h-3 w-3" />Gmail no configurado
            </Badge>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending || !status?.configured}>
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizar
            </Button>
          )}
        </div>
      </div>

      {syncMutation.data && (
        <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-0.5">
          <span>
            Sync completado — nuevos: <strong>{syncMutation.data.imported}</strong>
            {syncMutation.data.rematched > 0 && (
              <> · re-asignados: <strong className="text-green-600">{syncMutation.data.rematched}</strong></>
            )}
            {' '}· omitidos: <strong>{syncMutation.data.skipped}</strong>
          </span>
          {syncMutation.data.unmatched.length > 0 && (
            <p className="text-yellow-600 text-xs">Sin match: {syncMutation.data.unmatched.join(', ')}</p>
          )}
        </div>
      )}

      {isAdmin && unmatchedNames.length > 0 && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm flex gap-2">
          <Info className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-yellow-800">
              Emails sin cliente asignado — estos nombres vienen en los correos pero no coinciden con ningún cliente:
            </p>
            <ul className="mt-1 space-y-0.5">
              {unmatchedNames.map((name) => (
                <li key={name} className="text-yellow-700 font-mono text-xs">• {name}</li>
              ))}
            </ul>
            <p className="text-yellow-600 text-xs mt-1">
              Verificá que el nombre del cliente en el sistema coincida con el que aparece acá.
            </p>
          </div>
        </div>
      )}

      {/* Calendario compacto */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="max-w-sm">
          <div className="rounded-lg border overflow-hidden">
            {/* Cabecera días */}
            <div className="grid grid-cols-7 bg-muted/40 border-b">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1.5 text-center text-[10px] font-medium text-muted-foreground">{d}</div>
              ))}
            </div>

            {/* Grilla */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-8 border-b border-r bg-muted/10" />;
                }

                const dayJobs = jobsByDay.get(day) ?? [];
                const result = worstResult(dayJobs);
                const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                const isHovered = hoveredDay === day;

                return (
                  <div
                    key={day}
                    className="h-8 border-b border-r relative flex flex-col items-center justify-center gap-0.5 select-none transition-colors hover:bg-muted/30"
                    onMouseEnter={() => dayJobs.length > 0 && setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <span className={`text-[11px] font-medium leading-none ${
                      isToday
                        ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                        : 'text-foreground'
                    }`}>
                      {day}
                    </span>
                    {result && (
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_COLORS[result]}`} />
                    )}

                    {/* Tooltip: solo nombres de tareas */}
                    {isHovered && dayJobs.length > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 w-52 rounded-md border bg-popover shadow-lg px-2.5 py-2 text-xs pointer-events-none">
                        <p className="font-semibold mb-1.5 text-foreground">
                          {day} de {MONTHS[month - 1]}
                        </p>
                        <div className="space-y-1">
                          {dayJobs.map((j) => (
                            <div key={j.id} className="flex items-center gap-1.5">
                              <span className={`shrink-0 px-1 rounded text-[9px] font-semibold ${RESULT_STYLES[j.result]}`}>
                                {RESULT_LABEL[j.result]}
                              </span>
                              <span className="truncate text-muted-foreground">{j.taskName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {(['SUCCESS', 'WARNING', 'FAILURE'] as const).map((r) => (
              <div key={r} className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${DOT_COLORS[r]}`} />
                {RESULT_LABEL[r]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de backups con filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Historial</span>
          <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-0.5">
            {(['7d', '30d', 'date'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setListFilter(f)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  listFilter === f
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === '7d' ? 'Últimos 7 días' : f === '30d' ? 'Últimos 30 días' : 'Fecha'}
              </button>
            ))}
          </div>
          {listFilter === 'date' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-7 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
        </div>

        {isLoadingAll ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando historial...
          </div>
        ) : filteredJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {listFilter === 'date'
              ? `Sin registros para el ${selectedDate}.`
              : `Sin registros en los últimos ${listFilter === '7d' ? '7' : '30'} días.`}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredJobs.map((job) => {
              const dateStr = new Date(job.occurredAt).toLocaleDateString('es-UY', {
                day: '2-digit', month: 'short', year: 'numeric',
              });
              const timeStr = new Date(job.occurredAt).toLocaleTimeString('es-UY', {
                hour: '2-digit', minute: '2-digit',
              });
              return (
                <div key={job.id} className="rounded-md border bg-card px-4 py-3 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${RESULT_STYLES[job.result]}`}>
                      {RESULT_LABEL[job.result]}
                    </span>
                    <span className="text-sm font-medium">{job.taskName}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{dateStr} {timeStr}</span>
                  </div>
                  <JobDetailGrid job={job} />
                  <JobMessageBlock job={job} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
