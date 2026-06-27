import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, AlertCircle, Filter, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { incidentsService, IncidentFilters } from '@/services/incidents.service';
import { clientsService } from '@/services/clients.service';
import { techniciansService } from '@/services/technicians.service';
import { IncidentStatus, Priority } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge, PRIORITY_RAIL_CLASS } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/utils';

const createSchema = z.object({
  title: z.string().min(1, 'Título requerido'),
  description: z.string().min(1, 'Descripción requerida'),
  clientId: z.string().min(1, 'Cliente requerido'),
  priority: z.nativeEnum(Priority).optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const STATUS_OPTIONS: { value: IncidentStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'OPEN', label: 'Abierto' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'RESOLVED', label: 'Resuelto' },
];

const PRIORITY_OPTIONS: { value: Priority | ''; label: string }[] = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'CRITICAL', label: 'Crítica' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'LOW', label: 'Baja' },
];

// Transiciones válidas de estado desde la lista (solo OPEN → IN_PROGRESS)
const INLINE_STATUS_OPTIONS: Record<IncidentStatus, { value: IncidentStatus; label: string }[]> = {
  OPEN: [
    { value: 'OPEN', label: 'Abierto' },
    { value: 'IN_PROGRESS', label: 'En progreso' },
  ],
  IN_PROGRESS: [
    { value: 'IN_PROGRESS', label: 'En progreso' },
  ],
  RESOLVED: [
    { value: 'RESOLVED', label: 'Resuelto' },
  ],
};

export function IncidentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<IncidentFilters>({});

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', filters],
    queryFn: () => incidentsService.list(filters),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsService.list(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: techniciansService.list,
    enabled: isAdmin,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { priority: Priority.MEDIUM },
  });

  const createMutation = useMutation({
    mutationFn: incidentsService.create,
    onSuccess: (inc) => { qc.invalidateQueries({ queryKey: ['incidents'] }); setCreating(false); reset(); navigate(`/incidents/${inc.id}`); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) =>
      incidentsService.changeStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, technicianId }: { id: string; technicianId: string | null }) =>
      incidentsService.assignTechnician(id, technicianId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Incidentes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{incidents.length} incidentes</p>
        </div>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo incidente</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-3">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select value={filters.status ?? ''} onValueChange={(v) => setFilters((f) => ({ ...f, status: (v as IncidentStatus) || undefined }))}>
            <SelectTrigger className="h-8 w-36 text-xs sm:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.priority ?? ''} onValueChange={(v) => setFilters((f) => ({ ...f, priority: (v as Priority) || undefined }))}>
            <SelectTrigger className="h-8 w-36 text-xs sm:w-44"><SelectValue placeholder="Prioridad" /></SelectTrigger>
            <SelectContent>{PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.clientId ?? ''} onValueChange={(v) => setFilters((f) => ({ ...f, clientId: v || undefined }))}>
            <SelectTrigger className="h-8 w-40 text-xs sm:w-48"><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los clientes</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filters.status || filters.priority || filters.clientId) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFilters({})}>Limpiar</Button>
          )}
        </CardContent>
      </Card>

      {/* Lista — mobile: cards con rail | desktop: tabla con rail */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : incidents.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={AlertCircle}
              title="No hay incidentes"
              description="No se encontraron incidentes con los filtros aplicados"
              action={<Button onClick={() => setCreating(true)} size="sm"><Plus className="h-4 w-4" />Nuevo incidente</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="flex overflow-hidden rounded-lg border border-border bg-card transition-colors hover:bg-accent/50 cursor-pointer"
                onClick={() => navigate(`/incidents/${inc.id}`)}
              >
                <div className={`w-1 shrink-0 ${PRIORITY_RAIL_CLASS[inc.priority]}`} />
                <div className="min-w-0 flex-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">{inc.title}</p>
                    <PriorityBadge priority={inc.priority} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[11px] text-muted-foreground">{inc.client?.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{formatDateTime(inc.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <StatusBadge status={inc.status} />
                    {inc.assignedTo && (
                      <span className="text-[11px] text-muted-foreground">{inc.assignedTo.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center pr-3">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="w-1 p-0" />
                      {['Título', 'Cliente', 'Prioridad', 'Estado', 'Técnico asignado', 'Fecha', ''].map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="group transition-colors hover:bg-muted/20">
                        <td className="p-0">
                          <div className={`h-full min-h-[46px] w-[3px] ${PRIORITY_RAIL_CLASS[inc.priority]}`} />
                        </td>
                        <td className="max-w-xs px-4 py-2.5 font-medium">
                          <button
                            className="block max-w-[220px] truncate text-left hover:underline"
                            onClick={() => navigate(`/incidents/${inc.id}`)}
                          >
                            {inc.title}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{inc.client?.name}</td>
                        <td className="px-4 py-2.5"><PriorityBadge priority={inc.priority} /></td>
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          {inc.status === 'RESOLVED' ? (
                            <StatusBadge status={inc.status} />
                          ) : (
                            <Select
                              value={inc.status}
                              onValueChange={(v) => statusMutation.mutate({ id: inc.id, status: v as IncidentStatus })}
                            >
                              <SelectTrigger className="h-7 w-36 border-0 bg-transparent p-1 text-xs focus:ring-0">
                                <StatusBadge status={inc.status} />
                              </SelectTrigger>
                              <SelectContent>
                                {INLINE_STATUS_OPTIONS[inc.status].map(o => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          {isAdmin ? (
                            <Select
                              value={inc.technicianId ?? 'unassigned'}
                              onValueChange={(v) => assignMutation.mutate({ id: inc.id, technicianId: v === 'unassigned' ? null : v })}
                            >
                              <SelectTrigger className="h-7 w-36 text-xs">
                                <SelectValue placeholder="Sin asignar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Sin asignar</SelectItem>
                                {technicians.filter(t => t.active).map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground">{inc.assignedTo?.name ?? '—'}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          {formatDateTime(inc.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/incidents/${inc.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}


      {/* Dialog crear */}
      <Dialog open={creating} onOpenChange={(o) => { if (!o) { setCreating(false); reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo incidente</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input {...register('title')} placeholder="Servidor sin respuesta" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea {...register('description')} placeholder="Describí el problema en detalle..." rows={3} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={watch('clientId') ?? ''} onValueChange={(v) => setValue('clientId', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={watch('priority') ?? 'MEDIUM'} onValueChange={(v) => setValue('priority', v as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="CRITICAL">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {createMutation.error && <p className="text-xs text-destructive">Ocurrió un error al crear el incidente.</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreating(false); reset(); }}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando...' : 'Crear incidente'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
