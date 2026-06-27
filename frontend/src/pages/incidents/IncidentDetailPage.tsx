import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Building2, Tag, Clock, Loader2, Send, Trash2, MessageSquare, Paperclip, Download, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { incidentsService } from '@/services/incidents.service';
import { techniciansService } from '@/services/technicians.service';
import { IncidentComment, IncidentAttachment, IncidentStatus } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDateTime, formatMinutes, formatBytes, downloadAuthFile } from '@/lib/utils';

const solutionSchema = z.object({
  description: z.string().min(20, 'Mínimo 20 caracteres'),
  timeSpentMinutes: z.coerce.number().int().positive('Debe ser un número positivo'),
});
type SolutionForm = z.infer<typeof solutionSchema>;

const STATUS_TRANSITIONS: Record<IncidentStatus, { value: IncidentStatus; label: string }[]> = {
  OPEN: [{ value: 'IN_PROGRESS', label: 'Iniciar progreso' }],
  IN_PROGRESS: [{ value: 'RESOLVED', label: 'Marcar resuelto' }],
  RESOLVED: [],
};

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, technician: currentTechnician } = useAuth();
  const [showSolutionForm, setShowSolutionForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [deleteAttachmentId, setDeleteAttachmentId] = useState<string | null>(null);
  const attachUploadRef = useRef<HTMLInputElement>(null);

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentsService.getById(id!),
    enabled: !!id,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<IncidentComment[]>({
    queryKey: ['comments', id],
    queryFn: () => incidentsService.listComments(id!),
    enabled: !!id,
  });

  const { data: attachments = [] } = useQuery<IncidentAttachment[]>({
    queryKey: ['attachments', id],
    queryFn: () => incidentsService.listAttachments(id!),
    enabled: !!id,
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => incidentsService.uploadAttachment(id!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', id] }),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachId: string) => incidentsService.deleteAttachment(id!, attachId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attachments', id] }); setDeleteAttachmentId(null); },
  });

  const handleAttachUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAttachmentMutation.mutate(file);
    e.target.value = '';
  };

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: techniciansService.list,
    enabled: !!id,
  });

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const statusMutation = useMutation({
    mutationFn: (status: IncidentStatus) => incidentsService.changeStatus(id!, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incident', id] }),
  });

  const assignMutation = useMutation({
    mutationFn: (technicianId: string | null) => incidentsService.assignTechnician(id!, technicianId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incident', id] }),
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SolutionForm>({
    resolver: zodResolver(solutionSchema),
  });

  const solutionMutation = useMutation({
    mutationFn: (data: SolutionForm) => incidentsService.registerSolution(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incident', id] }); setShowSolutionForm(false); },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => incidentsService.createComment(id!, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', id] });
      setCommentText('');
      setCommentError(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al enviar el comentario';
      setCommentError(msg);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => incidentsService.deleteComment(id!, commentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comments', id] }); setDeleteCommentId(null); },
  });

  const handleCommentSubmit = () => {
    const trimmed = commentText.trim();
    if (!trimmed || commentMutation.isPending) return;
    setCommentError(null);
    commentMutation.mutate(trimmed);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  if (!incident) return <div className="p-8 text-center text-destructive">Incidente no encontrado</div>;

  const transitions = STATUS_TRANSITIONS[incident.status];
  const canAddSolution = incident.status === 'IN_PROGRESS' && !incident.solution;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/incidents')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{incident.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.priority} />
            {incident.tags.map(t => (
              <Badge key={t.id} variant="outline" className="text-xs">
                <Tag className="mr-1 h-2.5 w-2.5" />{t.name}
              </Badge>
            ))}
          </div>
        </div>
        {transitions.length > 0 && (
          <div className="flex gap-2 shrink-0">
            {transitions.map((t) => (
              <Button key={t.value} size="sm"
                variant={t.value === 'RESOLVED' ? 'default' : 'outline'}
                disabled={statusMutation.isPending || (t.value === 'RESOLVED' && !incident.solution)}
                onClick={() => statusMutation.mutate(t.value)}
                title={t.value === 'RESOLVED' && !incident.solution ? 'Registrá una solución primero' : undefined}>
                {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-4 lg:col-span-2">
          {/* Descripción */}
          <Card>
            <CardHeader><CardTitle className="text-base">Descripción</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
            </CardContent>
          </Card>

          {/* Solución */}
          {incident.solution ? (
            <Card className="border-green-200 dark:border-green-900">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-green-700 dark:text-green-400">
                  <Clock className="h-4 w-4" />
                  Solución registrada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{incident.solution.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Tiempo: <strong>{formatMinutes(incident.solution.timeSpentMinutes)}</strong></span>
                  <span>{formatDateTime(incident.solution.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ) : canAddSolution && (
            <Card className="border-dashed">
              <CardContent className="pt-4">
                {!showSolutionForm ? (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">Registrá la solución para poder cerrar el incidente</p>
                    <Button size="sm" onClick={() => setShowSolutionForm(true)}>Registrar solución</Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit((d) => solutionMutation.mutate(d))} className="space-y-4">
                    <h3 className="font-medium">Registrar solución</h3>
                    <div className="space-y-2">
                      <Label>Descripción <span className="text-muted-foreground text-xs">(mínimo 20 caracteres)</span></Label>
                      <Textarea {...register('description')} placeholder="Describí cómo se resolvió el problema..." rows={4} />
                      {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Tiempo empleado (minutos)</Label>
                      <Input {...register('timeSpentMinutes')} type="number" min={1} placeholder="45" className="w-40" />
                      {errors.timeSpentMinutes && <p className="text-xs text-destructive">{errors.timeSpentMinutes.message}</p>}
                    </div>
                    {solutionMutation.error && <p className="text-xs text-destructive">Error al registrar la solución.</p>}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : 'Guardar solución'}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowSolutionForm(false)}>Cancelar</Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Adjuntos */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Paperclip className="h-4 w-4" />
                  Adjuntos
                  {attachments.length > 0 && <span className="text-sm font-normal text-muted-foreground">({attachments.length})</span>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {uploadAttachmentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Button size="sm" variant="outline" onClick={() => attachUploadRef.current?.click()} disabled={uploadAttachmentMutation.isPending}>
                    <Upload className="h-4 w-4" />Subir archivo
                  </Button>
                  <input ref={attachUploadRef} type="file" className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={handleAttachUpload} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">Sin adjuntos aún. Subí imágenes, capturas o PDFs relacionados al incidente.</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{att.filename}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatBytes(att.size)}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Descargar"
                          onClick={() => { void downloadAuthFile(incidentsService.getAttachmentDownloadUrl(id!, att.id), att.filename); }}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteAttachmentId(att.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Comentarios
                {comments.length > 0 && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">({comments.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {commentsLoading ? (
                <p className="text-sm text-muted-foreground">Cargando comentarios...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin comentarios aún.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {comments.map((c) => {
                    const isOwn = c.technicianId === currentTechnician?.id;
                    const canDelete = isOwn || isAdmin;
                    return (
                      <div key={c.id} className="group flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                          {c.author.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium">{c.author.name}</span>
                            <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                          </div>
                          <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                        </div>
                        {canDelete && (
                          <Button variant="ghost" size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => setDeleteCommentId(c.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  <div ref={commentsEndRef} />
                </div>
              )}

              {/* Input nuevo comentario */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => { setCommentText(e.target.value); setCommentError(null); }}
                    placeholder="Agregá un comentario..."
                    rows={2}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(); }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-auto self-end shrink-0"
                    disabled={!commentText.trim() || commentMutation.isPending}
                    onClick={handleCommentSubmit}
                  >
                    {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {commentError && (
                  <p className="text-xs text-destructive">{commentError}</p>
                )}
                <p className="text-xs text-muted-foreground">Enter para enviar · Shift+Enter para nueva línea</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar de info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <button className="font-medium hover:underline text-left" onClick={() => navigate(`/clients/${incident.clientId}`)}>
                    {incident.client?.name}
                  </button>
                </div>
              </div>
              {incident.equipment && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Equipo</p>
                    <p className="font-medium">{incident.equipment.name}</p>
                  </div>
                </div>
              )}
              <div className="border-t pt-3 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Creado</p>
                  <p>{formatDateTime(incident.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actualizado</p>
                  <p>{formatDateTime(incident.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asignación */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Técnico asignado</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={incident.technicianId ?? 'unassigned'}
                onValueChange={(v) => assignMutation.mutate(v === 'unassigned' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  {technicians.filter(t => t.active).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignMutation.isPending && <p className="text-xs text-muted-foreground mt-1">Guardando...</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteCommentId}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={() => deleteCommentId && deleteCommentMutation.mutate(deleteCommentId)}
        title="Eliminar comentario"
        description="¿Eliminar este comentario? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleteCommentMutation.isPending}
      />
      <ConfirmDialog
        open={!!deleteAttachmentId}
        onClose={() => setDeleteAttachmentId(null)}
        onConfirm={() => deleteAttachmentId && deleteAttachmentMutation.mutate(deleteAttachmentId)}
        title="Eliminar adjunto"
        description="¿Eliminar este archivo? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleteAttachmentMutation.isPending}
      />
    </div>
  );
}
