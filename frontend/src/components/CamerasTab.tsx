import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, EyeOff, Pencil, Trash2, ChevronDown, ChevronRight, Key, Loader2, Server, Camera as CameraIcon, Download, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { nvrService, NVRForm } from '@/services/nvr.service';
import { camerasService, CameraForm } from '@/services/cameras.service';
import { branchService } from '@/services/branch.service';
import { authService } from '@/services/auth.service';
import { NVR, Camera } from '@/types';
import { exportCamerasTemplate, exportCamerasData } from '@/utils/excel';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';

interface Props { clientId: string; clientName: string }

const nvrSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  ip: z.string().min(1, 'IP requerida'),
  port: z.coerce.number().int().min(1).max(65535).optional().or(z.literal('')),
  brand: z.string().optional(),
  model: z.string().optional(),
  notes: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});
type NVRFormValues = z.infer<typeof nvrSchema>;

const cameraSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  nvrId: z.string().optional(),
  ip: z.string().optional(),
  channel: z.coerce.number().int().min(1).optional().or(z.literal('')),
  location: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});
type CameraFormValues = z.infer<typeof cameraSchema>;

function CredentialField({ value }: { label: string; value: string | null }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="flex items-center gap-1 font-mono text-xs">
      {show ? value : '••••••••'}
      <button type="button" onClick={() => setShow(s => !s)} className="text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </span>
  );
}

interface CredentialsBadgeProps {
  clientId: string;
  resourceId: string;
  type: 'nvr' | 'camera';
  others: { id: string; name: string }[];
}

function CredentialsBadge({ clientId, resourceId, type, others }: CredentialsBadgeProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [propagating, setPropagating] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyPwd, setVerifyPwd] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['credentials', type, resourceId],
    queryFn: () => type === 'nvr'
      ? nvrService.getCredentials(clientId, resourceId)
      : camerasService.getCredentials(clientId, resourceId),
    enabled: false,
  });

  const propagateMutation = useMutation({
    mutationFn: async () => {
      for (const targetId of selectedTargets) {
        const payload = {
          username: data?.username ?? null,
          password: data?.password ?? null,
        };
        if (type === 'nvr') {
          await nvrService.update(clientId, targetId, payload);
        } else {
          await camerasService.update(clientId, targetId, payload);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [type === 'nvr' ? 'nvrs' : 'cameras', clientId] });
      setPropagating(false);
      setSelectedTargets(new Set());
    },
  });

  const handleReveal = () => {
    setVerifyPwd('');
    setVerifyError('');
    setVerifyOpen(true);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyError('');
    try {
      await authService.verifyPassword(verifyPwd);
      setVerifyOpen(false);
      setVerifyPwd('');
      setOpen(true);
      refetch();
    } catch {
      setVerifyError('Contraseña incorrecta. Intentá de nuevo.');
    } finally {
      setVerifying(false);
    }
  };

  const hasCredentials = data && (data.username || data.password);
  const canPropagate = hasCredentials && others.length > 0;

  const toggleTarget = (id: string) => {
    setSelectedTargets(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  return (
    <>
      <Button type="button" variant="ghost" size="icon" title="Ver credenciales" onClick={handleReveal}>
        <Key className="h-3.5 w-3.5" />
      </Button>

      {/* Diálogo de verificación de identidad */}
      <Dialog open={verifyOpen} onOpenChange={(o) => { setVerifyOpen(o); if (!o) setVerifyPwd(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar identidad</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Ingresá tu contraseña del sistema para ver las credenciales del dispositivo.</p>
          <div className="space-y-2">
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={verifyPwd}
              onChange={e => setVerifyPwd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verifyPwd && handleVerify()}
              autoFocus
              autoComplete="current-password"
            />
            {verifyError && <p className="text-xs text-destructive">{verifyError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setVerifyOpen(false)}>Cancelar</Button>
            <Button type="button" size="sm" disabled={!verifyPwd || verifying} onClick={handleVerify}>
              {verifying ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Verificando...</> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPropagating(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{propagating ? 'Copiar credenciales a otros' : 'Credenciales'}</DialogTitle>
          </DialogHeader>

          {!propagating ? (
            <>
              {isLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Usuario</p>
                    <CredentialField label="Usuario" value={data?.username ?? null} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Contraseña</p>
                    <CredentialField label="Contraseña" value={data?.password ?? null} />
                  </div>
                  {canPropagate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => { setPropagating(true); setSelectedTargets(new Set()); }}
                    >
                      Copiar a otros {type === 'nvr' ? 'NVRs' : 'cámaras'}
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Seleccioná los {type === 'nvr' ? 'NVRs' : 'cámaras'} a los que querés copiar estas credenciales:
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded border p-2">
                {others.map(target => (
                  <label key={target.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedTargets.has(target.id)}
                      onChange={() => toggleTarget(target.id)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {target.name}
                  </label>
                ))}
              </div>
              {propagateMutation.isError && (
                <p className="text-xs text-destructive">Error al copiar credenciales. Verificá la conexión.</p>
              )}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPropagating(false)}>
                  Volver
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedTargets.size === 0 || propagateMutation.isPending}
                  onClick={() => propagateMutation.mutate()}
                >
                  {propagateMutation.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Copiando...</> : `Copiar a ${selectedTargets.size} seleccionado${selectedTargets.size !== 1 ? 's' : ''}`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CamerasTab({ clientId, clientName }: Props) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);

  const [search, setSearch] = useState('');
  const [filterNvrId, setFilterNvrId] = useState<string>('all');
  const [expandedNvrs, setExpandedNvrs] = useState<Set<string>>(new Set());

  // NVR form state
  const [nvrDialog, setNvrDialog] = useState<{ open: boolean; edit?: NVR }>({ open: false });
  const [deleteNvr, setDeleteNvr] = useState<NVR | null>(null);

  // Camera form state
  const [camDialog, setCamDialog] = useState<{ open: boolean; edit?: Camera }>({ open: false });
  const [deleteCam, setDeleteCam] = useState<Camera | null>(null);

  const { data: nvrs = [], isLoading: loadingNvrs } = useQuery({
    queryKey: ['nvrs', clientId],
    queryFn: () => nvrService.list(clientId),
  });

  const { data: cameras = [], isLoading: loadingCams } = useQuery({
    queryKey: ['cameras', clientId, filterNvrId, search],
    queryFn: () => camerasService.list(clientId, {
      nvrId: filterNvrId !== 'all' ? filterNvrId : undefined,
      search: search || undefined,
    }),
  });

  // Cuando hay búsqueda activa, expande automáticamente los NVRs con coincidencias
  useEffect(() => {
    if (search.trim().length === 0) return;
    const matchingNvrIds = nvrs
      .filter(nvr => cameras.some(c => c.nvrId === nvr.id))
      .map(nvr => nvr.id);
    if (matchingNvrIds.length > 0) {
      setExpandedNvrs(prev => new Set([...prev, ...matchingNvrIds]));
    }
  }, [search, cameras, nvrs]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['nvrs', clientId] });
    qc.invalidateQueries({ queryKey: ['cameras', clientId] });
  };

  // NVR mutations
  const nvrForm = useForm<NVRFormValues>({ resolver: zodResolver(nvrSchema) });
  const createNvr = useMutation({ mutationFn: (d: NVRForm) => nvrService.create(clientId, d), onSuccess: () => { invalidate(); setNvrDialog({ open: false }); nvrForm.reset(); } });
  const updateNvr = useMutation({ mutationFn: (d: NVRForm) => nvrService.update(clientId, nvrDialog.edit!.id, d), onSuccess: () => { invalidate(); setNvrDialog({ open: false }); nvrForm.reset(); } });
  const deactivateNvr = useMutation({ mutationFn: (id: string) => nvrService.deactivate(clientId, id), onSuccess: () => { invalidate(); setDeleteNvr(null); } });

  // Camera mutations
  const camForm = useForm<CameraFormValues>({ resolver: zodResolver(cameraSchema) });
  const createCam = useMutation({ mutationFn: (d: CameraForm) => camerasService.create(clientId, d), onSuccess: () => { invalidate(); setCamDialog({ open: false }); camForm.reset(); } });
  const updateCam = useMutation({ mutationFn: (d: CameraForm) => camerasService.update(clientId, camDialog.edit!.id, d), onSuccess: () => { invalidate(); setCamDialog({ open: false }); camForm.reset(); } });
  const deactivateCam = useMutation({ mutationFn: (id: string) => camerasService.deactivate(clientId, id), onSuccess: () => { invalidate(); setDeleteCam(null); } });

  const importCamMutation = useMutation({
    mutationFn: (file: File) => branchService.importCameras(clientId, file),
    onSuccess: (result) => { setImportResult(result); invalidate(); },
  });

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importCamMutation.mutate(file);
    e.target.value = '';
  };

  const openCreateNvr = () => { nvrForm.reset({ name: '', ip: '', port: undefined, brand: '', model: '', notes: '', username: '', password: '' }); setNvrDialog({ open: true }); };
  const openEditNvr = (nvr: NVR) => { nvrForm.reset({ name: nvr.name, ip: nvr.ip, port: nvr.port ?? undefined, brand: nvr.brand ?? '', model: nvr.model ?? '', notes: nvr.notes ?? '', username: '', password: '' }); setNvrDialog({ open: true, edit: nvr }); };
  const openCreateCam = () => { camForm.reset({ name: '', nvrId: '', ip: '', channel: undefined, location: '', brand: '', model: '', username: '', password: '' }); setCamDialog({ open: true }); };
  const openEditCam = (cam: Camera) => { camForm.reset({ name: cam.name, nvrId: cam.nvrId ?? '', ip: cam.ip ?? '', channel: cam.channel ?? undefined, location: cam.location ?? '', brand: cam.brand ?? '', model: cam.model ?? '', username: '', password: '' }); setCamDialog({ open: true, edit: cam }); };

  const onSubmitNvr = (d: NVRFormValues) => {
    const body = { ...d, port: d.port === '' ? undefined : d.port as number | undefined };
    nvrDialog.edit ? updateNvr.mutate(body) : createNvr.mutate(body);
  };
  const onSubmitCam = (d: CameraFormValues) => {
    const body = { ...d, channel: d.channel === '' ? undefined : d.channel as number | undefined, nvrId: d.nvrId || undefined };
    camDialog.edit ? updateCam.mutate(body) : createCam.mutate(body);
  };

  const toggleNvr = (id: string) => setExpandedNvrs(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const isLoading = loadingNvrs || loadingCams;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cámara o IP..." className="pl-9 w-52" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterNvrId} onValueChange={setFilterNvrId}>
            <SelectTrigger className="w-44 bg-background"><SelectValue placeholder="Todos los NVRs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los NVRs</SelectItem>
              <SelectItem value="none">Sin NVR</SelectItem>
              {nvrs.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => exportCamerasTemplate(clientName)}>
            <Download className="h-4 w-4" />Template Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportCamerasData(cameras, clientName)} disabled={cameras.length === 0}>
            <Download className="h-4 w-4" />Exportar datos
          </Button>
          <Button size="sm" variant="outline" onClick={() => importFileRef.current?.click()} disabled={importCamMutation.isPending}>
            <Upload className="h-4 w-4" />{importCamMutation.isPending ? 'Importando...' : 'Importar Excel'}
          </Button>
          <input ref={importFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
          <Button size="sm" variant="outline" onClick={openCreateNvr}><Server className="h-4 w-4" />Nuevo NVR</Button>
          <Button size="sm" onClick={openCreateCam}><Plus className="h-4 w-4" />Nueva cámara</Button>
        </div>
      </div>

      {importResult && (
        <div className={`rounded-md px-3 py-2 text-sm ${importResult.errors.length > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200' : 'bg-green-50 dark:bg-green-950/20 border border-green-200'}`}>
          <div className="flex items-center justify-between">
            <span>Importación completada: <strong>{importResult.imported}</strong> cámaras importadas
              {importResult.errors.length > 0 && <>, <strong className="text-destructive">{importResult.errors.length}</strong> errores</>}
            </span>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setImportResult(null)}>✕</Button>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {importResult.errors.map(e => <li key={e.row} className="text-xs text-destructive">Fila {e.row}: {e.message}</li>)}
            </ul>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : cameras.length === 0 && nvrs.length === 0 ? (
        <EmptyState icon={CameraIcon} title="Sin cámaras registradas" description="Agregá un NVR y sus cámaras" action={<Button size="sm" onClick={openCreateNvr}><Server className="h-4 w-4" />Nuevo NVR</Button>} />
      ) : (
        <div className="space-y-3">
          {/* NVRs como acordeón */}
          {nvrs.map(nvr => {
            const nvrCams = cameras.filter(c => c.nvrId === nvr.id);
            const expanded = expandedNvrs.has(nvr.id);
            const hasMatch = search.trim().length > 0 && nvrCams.length > 0;
            return (
              <Card key={nvr.id} className={hasMatch ? 'ring-2 ring-primary/60 shadow-sm' : ''}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <button type="button" className="flex items-center gap-2 text-left flex-1" onClick={() => toggleNvr(nvr.id)}>
                      {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{nvr.name}</span>
                      <Badge variant="outline" className="text-xs font-mono">{nvr.ip}{nvr.port ? `:${nvr.port}` : ''}</Badge>
                      {nvr.brand && <span className="text-xs text-muted-foreground">{nvr.brand}{nvr.model ? ` ${nvr.model}` : ''}</span>}
                      <Badge variant="secondary" className="text-xs">{nvrCams.length} cám{nvrCams.length !== 1 ? 's' : ''}</Badge>
                    </button>
                    <div className="flex items-center gap-1">
                      <CredentialsBadge clientId={clientId} resourceId={nvr.id} type="nvr" others={nvrs.filter(n => n.id !== nvr.id).map(n => ({ id: n.id, name: n.name }))} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEditNvr(nvr)}><Pencil className="h-3.5 w-3.5" /></Button>
                      {isAdmin && <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteNvr(nvr)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                </CardHeader>
                {expanded && (
                  <CardContent className="pt-0 pb-3 px-4">
                    {nvrCams.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-6">Sin cámaras asignadas a este NVR</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead><tr className="text-xs text-muted-foreground border-b">
                          <th className="text-left py-1 pl-6">Nombre</th>
                          <th className="text-left py-1">IP</th>
                          <th className="text-left py-1">Canal</th>
                          <th className="text-left py-1">Ubicación</th>
                          <th />
                        </tr></thead>
                        <tbody className="divide-y">
                          {nvrCams.map(cam => (
                            <tr key={cam.id} className="hover:bg-muted/20">
                              <td className="py-1.5 pl-6 font-medium">{cam.name}</td>
                              <td className="py-1.5 font-mono text-xs text-muted-foreground">{cam.ip ?? '—'}</td>
                              <td className="py-1.5 text-muted-foreground">{cam.channel ?? '—'}</td>
                              <td className="py-1.5 text-muted-foreground">{cam.location ?? '—'}</td>
                              <td className="py-1.5">
                                <div className="flex items-center gap-1 justify-end">
                                  <CredentialsBadge clientId={clientId} resourceId={cam.id} type="camera" others={cameras.filter(c => c.id !== cam.id).map(c => ({ id: c.id, name: c.name }))} />
                                  <Button type="button" variant="ghost" size="icon" onClick={() => openEditCam(cam)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  {isAdmin && <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteCam(cam)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Cámaras sin NVR */}
          {cameras.filter(c => !c.nvrId).length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <CameraIcon className="h-4 w-4" />Cámaras sin NVR
                  <Badge variant="secondary" className="text-xs">{cameras.filter(c => !c.nvrId).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3 px-4">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-muted-foreground border-b">
                    <th className="text-left py-1">Nombre</th>
                    <th className="text-left py-1">IP</th>
                    <th className="text-left py-1">Ubicación</th>
                    <th />
                  </tr></thead>
                  <tbody className="divide-y">
                    {cameras.filter(c => !c.nvrId).map(cam => (
                      <tr key={cam.id} className="hover:bg-muted/20">
                        <td className="py-1.5 font-medium">{cam.name}</td>
                        <td className="py-1.5 font-mono text-xs text-muted-foreground">{cam.ip ?? '—'}</td>
                        <td className="py-1.5 text-muted-foreground">{cam.location ?? '—'}</td>
                        <td className="py-1.5">
                          <div className="flex items-center gap-1 justify-end">
                            <CredentialsBadge clientId={clientId} resourceId={cam.id} type="camera" others={cameras.filter(c => c.id !== cam.id).map(c => ({ id: c.id, name: c.name }))} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => openEditCam(cam)}><Pencil className="h-3.5 w-3.5" /></Button>
                            {isAdmin && <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteCam(cam)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialog NVR */}
      <Dialog open={nvrDialog.open} onOpenChange={open => !open && setNvrDialog({ open: false })}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{nvrDialog.edit ? 'Editar NVR' : 'Nuevo NVR'}</DialogTitle></DialogHeader>
          <form onSubmit={nvrForm.handleSubmit(onSubmitNvr)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1"><Label>Nombre *</Label><Input {...nvrForm.register('name')} />{nvrForm.formState.errors.name && <p className="text-xs text-destructive">{nvrForm.formState.errors.name.message}</p>}</div>
              <div className="space-y-1"><Label>IP *</Label><Input {...nvrForm.register('ip')} placeholder="192.168.1.100" />{nvrForm.formState.errors.ip && <p className="text-xs text-destructive">{nvrForm.formState.errors.ip.message}</p>}</div>
              <div className="space-y-1"><Label>Puerto</Label><Input {...nvrForm.register('port')} type="number" placeholder="8000" /></div>
              <div className="space-y-1"><Label>Marca</Label><Input {...nvrForm.register('brand')} placeholder="Hikvision" /></div>
              <div className="space-y-1"><Label>Modelo</Label><Input {...nvrForm.register('model')} /></div>
              <div className="col-span-2 space-y-1"><Label>Notas</Label><Input {...nvrForm.register('notes')} /></div>
              <div className="col-span-2 border-t pt-3 space-y-1">
                <p className="text-xs text-muted-foreground mb-2">Credenciales (cifradas — solo visible para administradores)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Usuario</Label><Input {...nvrForm.register('username')} autoComplete="off" /></div>
                  <div className="space-y-1"><Label>Contraseña</Label><Input {...nvrForm.register('password')} type="password" autoComplete="new-password" /></div>
                </div>
                {nvrDialog.edit && <p className="text-xs text-muted-foreground">Dejá vacío para mantener la contraseña actual.</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNvrDialog({ open: false })}>Cancelar</Button>
              <Button type="submit" disabled={createNvr.isPending || updateNvr.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Cámara */}
      <Dialog open={camDialog.open} onOpenChange={open => !open && setCamDialog({ open: false })}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{camDialog.edit ? 'Editar cámara' : 'Nueva cámara'}</DialogTitle></DialogHeader>
          <form onSubmit={camForm.handleSubmit(onSubmitCam)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1"><Label>Nombre *</Label><Input {...camForm.register('name')} />{camForm.formState.errors.name && <p className="text-xs text-destructive">{camForm.formState.errors.name.message}</p>}</div>
              <div className="col-span-2 space-y-1">
                <Label>NVR al que pertenece</Label>
                <Select value={camForm.watch('nvrId') ?? ''} onValueChange={v => camForm.setValue('nvrId', v === 'none' ? undefined : v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Sin NVR (cámara independiente)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin NVR</SelectItem>
                    {nvrs.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>IP</Label><Input {...camForm.register('ip')} placeholder="192.168.1.101" /></div>
              <div className="space-y-1"><Label>Canal</Label><Input {...camForm.register('channel')} type="number" placeholder="1" /></div>
              <div className="space-y-1"><Label>Ubicación</Label><Input {...camForm.register('location')} placeholder="Entrada principal" /></div>
              <div className="space-y-1"><Label>Marca</Label><Input {...camForm.register('brand')} placeholder="Dahua" /></div>
              <div className="col-span-2 space-y-1"><Label>Modelo</Label><Input {...camForm.register('model')} /></div>
              <div className="col-span-2 border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">Credenciales (cifradas — solo visible para administradores)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Usuario</Label><Input {...camForm.register('username')} autoComplete="off" /></div>
                  <div className="space-y-1"><Label>Contraseña</Label><Input {...camForm.register('password')} type="password" autoComplete="new-password" /></div>
                </div>
                {camDialog.edit && <p className="text-xs text-muted-foreground mt-1">Dejá vacío para mantener la contraseña actual.</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCamDialog({ open: false })}>Cancelar</Button>
              <Button type="submit" disabled={createCam.isPending || updateCam.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm eliminar NVR */}
      <ConfirmDialog
        open={!!deleteNvr}
        title={`Eliminar NVR "${deleteNvr?.name}"`}
        description="Las cámaras asignadas a este NVR quedarán sin NVR asignado. ¿Confirmar?"
        onConfirm={() => deleteNvr && deactivateNvr.mutate(deleteNvr.id)}
        onClose={() => setDeleteNvr(null)}
      />
      <ConfirmDialog
        open={!!deleteCam}
        title={`Eliminar cámara "${deleteCam?.name}"`}
        description="Se desactivará la cámara. ¿Confirmar?"
        onConfirm={() => deleteCam && deactivateCam.mutate(deleteCam.id)}
        onClose={() => setDeleteCam(null)}
      />
    </div>
  );
}
