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

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function BackupCalendar({ clientId }: Props) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [tappedDay, setTappedDay] = useState<number | null>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['backups', clientId, year, month],
    queryFn: () => backupsService.listByClient(clientId, year, month),
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
      qc.invalidateQueries({ queryKey: ['backup-status'] });
      qc.invalidateQueries({ queryKey: ['backup-unmatched-names'] });
    },
  });

  // Agrupa los jobs por día del mes
  const jobsByDay = useMemo(() => {
    const map = new Map<number, BackupJob[]>();
    for (const job of jobs) {
      const d = new Date(job.occurredAt).getDate();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(job);
    }
    return map;
  }, [jobs]);

  // Construye la grilla del mes
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    // getDay() devuelve 0=Dom..6=Sáb; convertir a Lun=0..Dom=6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();

    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // Rellenar hasta múltiplo de 7
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const prevMonth = () => {
    setTappedDay(null);
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setTappedDay(null);
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="space-y-4">
      {/* Header con navegación y botón sync */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold w-40 text-center">{MONTHS[month - 1]} {year}</span>
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
              Emails sin cliente asignado — estos nombres vienen en los correos pero no coinciden con ningún cliente en el sistema:
            </p>
            <ul className="mt-1 space-y-0.5">
              {unmatchedNames.map((name) => (
                <li key={name} className="text-yellow-700 font-mono text-xs">• {name}</li>
              ))}
            </ul>
            <p className="text-yellow-600 text-xs mt-1">
              Verificá que el nombre del cliente en el sistema sea igual al que aparece acá.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {/* Cabecera días de semana */}
          <div className="grid grid-cols-7 bg-muted/40 border-b">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Grilla de días */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square border-b border-r last:border-r-0 bg-muted/20" />;
              }

              const dayJobs = jobsByDay.get(day) ?? [];
              const result = worstResult(dayJobs);
              const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();

              const isActive = hoveredDay === day || tappedDay === day;
              return (
                <div
                  key={day}
                  className={`aspect-square border-b border-r last:border-r-0 relative flex flex-col items-center justify-center gap-0.5 select-none transition-colors hover:bg-muted/30 ${dayJobs.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => {
                    if (dayJobs.length === 0) return;
                    setTappedDay(prev => prev === day ? null : day);
                  }}
                >
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                    {day}
                  </span>
                  {result && (
                    <span className={`text-[9px] font-semibold px-1 rounded ${RESULT_STYLES[result]}`}>
                      {RESULT_LABEL[result]}
                    </span>
                  )}
                  {dayJobs.length > 1 && (
                    <span className="text-[9px] text-muted-foreground">{dayJobs.length} jobs</span>
                  )}

                  {/* Tooltip al hacer hover o tap */}
                  {isActive && dayJobs.length > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 rounded-md border bg-popover shadow-lg p-2 text-xs pointer-events-none"
                      style={{ width: dayJobs.some(j => j.startTime) ? '22rem' : '16rem' }}>
                      <p className="font-semibold mb-2">{day} de {MONTHS[month - 1]}</p>
                      <div className="space-y-2">
                        {dayJobs.map((j) => (
                          <div key={j.id}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-1 rounded text-[9px] font-semibold shrink-0 ${RESULT_STYLES[j.result]}`}>
                                {RESULT_LABEL[j.result]}
                              </span>
                              <span className="truncate text-muted-foreground font-medium">{j.taskName}</span>
                            </div>
                            {(j.startTime || j.duration || j.dataSize) && (
                              <table className="w-full text-[10px] border-collapse">
                                <tbody>
                                  {(j.startTime || j.endTime) && (
                                    <tr className="border-t border-border/50">
                                      <td className="py-0.5 pr-2 text-muted-foreground w-1/2">Inicio</td>
                                      <td className="py-0.5 pr-2 text-muted-foreground w-1/2">Fin</td>
                                    </tr>
                                  )}
                                  {(j.startTime || j.endTime) && (
                                    <tr>
                                      <td className="pb-1 pr-2 font-mono">{j.startTime ?? '—'}</td>
                                      <td className="pb-1 pr-2 font-mono">{j.endTime ?? '—'}</td>
                                    </tr>
                                  )}
                                  {(j.dataSize || j.dataRead || j.dataTransferred || j.duration) && (
                                    <tr className="border-t border-border/50">
                                      <td className="py-0.5 pr-2 text-muted-foreground">Tamaño</td>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Leído</td>
                                    </tr>
                                  )}
                                  {(j.dataSize || j.dataRead) && (
                                    <tr>
                                      <td className="pb-1 pr-2 font-mono">{j.dataSize ?? '—'}</td>
                                      <td className="pb-1 pr-2 font-mono">{j.dataRead ?? '—'}</td>
                                    </tr>
                                  )}
                                  {(j.dataTransferred || j.duration) && (
                                    <tr className="border-t border-border/50">
                                      <td className="py-0.5 pr-2 text-muted-foreground">Transferido</td>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Duración</td>
                                    </tr>
                                  )}
                                  {(j.dataTransferred || j.duration) && (
                                    <tr>
                                      <td className="pb-0.5 pr-2 font-mono">{j.dataTransferred ?? '—'}</td>
                                      <td className="pb-0.5 pr-2 font-mono">{j.duration ?? '—'}</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            )}
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
      )}

      {/* Leyenda */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          {(['SUCCESS', 'WARNING', 'FAILURE'] as const).map((r) => (
            <div key={r} className="flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-full ${r === 'SUCCESS' ? 'bg-green-500' : r === 'WARNING' ? 'bg-yellow-400' : 'bg-red-500'}`} />
              {RESULT_LABEL[r]}
            </div>
          ))}
        </div>
        <p>Si hay múltiples jobs en un día se muestra el peor resultado</p>
      </div>
    </div>
  );
}
