import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Phone, Mail, AlertCircle, HardDrive, Download, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientsService } from '@/services/clients.service';
import { backupsService } from '@/services/backups.service';
import { branchService } from '@/services/branch.service';
import { Equipment, Contact } from '@/types';
import { BackupCalendar } from '@/components/BackupCalendar';
import { CamerasTab } from '@/components/CamerasTab';
import { BranchesTab } from '@/components/BranchesTab';
import { exportEquipmentTemplate, exportEquipmentData } from '@/utils/excel';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatDateTime, whatsappLink } from '@/lib/utils';

const equipmentSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  ip: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  os: z.string().optional(),
});
type EquipmentForm = z.infer<typeof equipmentSchema>;

const contactSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
});
type ContactForm = z.infer<typeof contactSchema>;

type Tab = 'info' | 'equipment' | 'contacts' | 'incidents' | 'cameras' | 'backups' | 'branches';

const clientInfoSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  city: z.string().min(1, 'Ciudad requerida'),
  rut: z.string().min(1, 'RUT requerido'),
  phone: z.string().min(1, 'Teléfono requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  publicIp: z.string().optional(),
  dynamicIp: z.boolean().optional(),
  isp: z.string().optional(),
  networkRange: z.string().optional(),
  servicePlan: z.string().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
});
type ClientInfoForm = z.infer<typeof clientInfoSchema>;

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('info');
  const [editingInfo, setEditingInfo] = useState(false);

  // Equipment state
  const [editEquipment, setEditEquipment] = useState<Equipment | null>(null);
  const [creatingEquipment, setCreatingEquipment] = useState(false);
  const [deactivateEquipment, setDeactivateEquipment] = useState<Equipment | null>(null);
  const [eqImportResult, setEqImportResult] = useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);
  const eqImportRef = useRef<HTMLInputElement>(null);

  // Contact state
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [creatingContact, setCreatingContact] = useState(false);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client-detail', id],
    queryFn: () => clientsService.getDetail(id!),
    enabled: !!id,
  });

  const { data: latestBackup } = useQuery({
    queryKey: ['backup-latest', id],
    queryFn: () => backupsService.latestByClient(id!),
    enabled: !!id,
  });

  // Info edit form — usa /infrastructure (accessible a todos los roles)
  const infoForm = useForm<ClientInfoForm>({ resolver: zodResolver(clientInfoSchema) });
  const updateInfoMutation = useMutation({
    mutationFn: (d: ClientInfoForm) => {
      // Convertir strings vacíos a null para que el backend no falle validación de email/opcionales
      const nullify = (v: string | undefined) => (v === '' ? null : v ?? null);
      const payload = {
        ...d,
        email: nullify(d.email),
        address: nullify(d.address),
        notes: nullify(d.notes),
        publicIp: d.dynamicIp ? null : nullify(d.publicIp),
        dynamicIp: d.dynamicIp ?? false,
        isp: nullify(d.isp),
        networkRange: nullify(d.networkRange),
        servicePlan: nullify(d.servicePlan),
        contractStart: nullify(d.contractStart),
        contractEnd: nullify(d.contractEnd),
      };
      return isAdmin
        ? clientsService.update(id!, payload)
        : clientsService.updateInfrastructure(id!, payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-detail', id] }); setEditingInfo(false); },
  });
  const openInfoEdit = () => {
    if (!client) return;
    infoForm.reset({
      name: client.name, city: client.city, rut: client.rut, phone: client.phone,
      email: client.email ?? '', address: client.address ?? '', notes: client.notes ?? '',
      publicIp: client.publicIp ?? '', dynamicIp: client.dynamicIp, isp: client.isp ?? '',
      networkRange: client.networkRange ?? '', servicePlan: client.servicePlan ?? '',
      contractStart: client.contractStart?.slice(0, 10) ?? '',
      contractEnd: client.contractEnd?.slice(0, 10) ?? '',
    });
    setEditingInfo(true);
  };

  // Equipment forms
  const eqForm = useForm<EquipmentForm>({ resolver: zodResolver(equipmentSchema) });
  const createEqMutation = useMutation({
    mutationFn: (d: EquipmentForm) => clientsService.createEquipment(id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-detail', id] }); setCreatingEquipment(false); eqForm.reset(); },
  });
  const updateEqMutation = useMutation({
    mutationFn: (d: EquipmentForm) => clientsService.updateEquipment(id!, editEquipment!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-detail', id] }); setEditEquipment(null); eqForm.reset(); },
  });
  const deactivateEqMutation = useMutation({
    mutationFn: (eqId: string) => clientsService.deactivateEquipment(id!, eqId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-detail', id] }); setDeactivateEquipment(null); },
  });
  const importEqMutation = useMutation({
    mutationFn: (file: File) => branchService.importEquipment(id!, file),
    onSuccess: (result) => { setEqImportResult(result); qc.invalidateQueries({ queryKey: ['client-detail', id] }); },
  });
  const handleEqImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importEqMutation.mutate(file);
    e.target.value = '';
  };

  // Contact forms
  const ctForm = useForm<ContactForm>({ resolver: zodResolver(contactSchema) });
  const createCtMutation = useMutation({
    mutationFn: (d: ContactForm) => clientsService.createContact(id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-detail', id] }); setCreatingContact(false); ctForm.reset(); },
  });
  const updateCtMutation = useMutation({
    mutationFn: (d: ContactForm) => clientsService.updateContact(id!, editContact!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-detail', id] }); setEditContact(null); ctForm.reset(); },
  });
  const deleteCtMutation = useMutation({
    mutationFn: (ctId: string) => clientsService.deleteContact(id!, ctId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-detail', id] }); setDeleteContact(null); },
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  if (!client) return <div className="p-8 text-center text-destructive">Cliente no encontrado</div>;

  const BACKUP_DOT: Record<'SUCCESS' | 'WARNING' | 'FAILURE', string> = {
    SUCCESS: 'bg-green-500',
    WARNING: 'bg-yellow-400',
    FAILURE: 'bg-red-500',
  };

  const TABS: { key: Tab; label: React.ReactNode }[] = [
    { key: 'info', label: 'Información' },
    { key: 'equipment', label: `Equipos (${client.equipment?.length ?? 0})` },
    { key: 'contacts', label: `Funcionarios (${client.contacts?.length ?? 0})` },
    { key: 'incidents', label: `Incidentes (${client.incidents?.length ?? 0})` },
    { key: 'branches', label: 'Sucursales' },
    { key: 'cameras', label: 'Cámaras' },
    {
      key: 'backups',
      label: (
        <span className="flex items-center gap-1.5">
          Backups
          {latestBackup && (
            <span
              className={`inline-block w-2 h-2 rounded-full ${BACKUP_DOT[latestBackup.result]}`}
              title={latestBackup.result}
            />
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <Badge variant={client.active ? 'success' : 'outline'}>{client.active ? 'Activo' : 'Inactivo'}</Badge>
          </div>
          <p className="text-muted-foreground">{client.city} · RUT {client.rut}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Información */}
      {tab === 'info' && (
        <div className="space-y-4">
          {/* Datos generales */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Nombre', value: client.name },
              { label: 'Ciudad', value: client.city },
              { label: 'RUT', value: client.rut },
              { label: 'Teléfono', value: client.phone },
              { label: 'Email', value: client.email },
              { label: 'Dirección', value: client.address },
            ].filter(f => f.value).map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium">{value}</p>
                </CardContent>
              </Card>
            ))}
            {client.notes && (
              <Card className="sm:col-span-2">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Notas</p>
                  <p className="text-sm">{client.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Infraestructura */}
          {(client.publicIp || client.dynamicIp || client.isp || client.networkRange) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Red</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {client.dynamicIp ? (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">IP pública</p>
                      <p className="font-medium text-sm text-yellow-600 dark:text-yellow-400">Dinámica</p>
                    </CardContent>
                  </Card>
                ) : client.publicIp ? (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">IP pública</p>
                      <p className="font-medium font-mono text-sm">{client.publicIp}</p>
                    </CardContent>
                  </Card>
                ) : null}
                {[
                  { label: 'ISP', value: client.isp },
                  { label: 'Rango de red', value: client.networkRange },
                ].filter(f => f.value).map(({ label, value }) => (
                  <Card key={label}>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium font-mono text-sm">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Contrato */}
          {(client.servicePlan || client.contractStart || client.contractEnd) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Contrato</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Plan', value: client.servicePlan },
                  { label: 'Inicio', value: client.contractStart ? formatDate(client.contractStart) : null },
                  { label: 'Vencimiento', value: client.contractEnd ? formatDate(client.contractEnd) : null },
                ].filter(f => f.value).map(({ label, value }) => (
                  <Card key={label}>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button size="sm" variant="outline" onClick={openInfoEdit}>
              <Pencil className="h-4 w-4" />Editar información
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Sucursales */}
      {tab === 'branches' && <BranchesTab clientId={client.id} />}

      {/* Tab: Equipos */}
      {tab === 'equipment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => exportEquipmentTemplate(client.name)}>
                <Download className="h-4 w-4" />Template Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportEquipmentData(client.equipment ?? [], client.name)} disabled={(client.equipment?.length ?? 0) === 0}>
                <Download className="h-4 w-4" />Exportar datos
              </Button>
              <Button size="sm" variant="outline" onClick={() => eqImportRef.current?.click()} disabled={importEqMutation.isPending}>
                <Upload className="h-4 w-4" />{importEqMutation.isPending ? 'Importando...' : 'Importar Excel'}
              </Button>
              <input ref={eqImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleEqImport} />
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => { eqForm.reset(); setCreatingEquipment(true); }}>
                <Plus className="h-4 w-4" />Agregar equipo
              </Button>
            )}
          </div>
          {eqImportResult && (
            <div className={`rounded-md px-3 py-2 text-sm ${eqImportResult.errors.length > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200' : 'bg-green-50 dark:bg-green-950/20 border border-green-200'}`}>
              <div className="flex items-center justify-between">
                <span>Importación: <strong>{eqImportResult.imported}</strong> equipos importados
                  {eqImportResult.errors.length > 0 && <>, <strong className="text-destructive">{eqImportResult.errors.length}</strong> errores</>}
                </span>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEqImportResult(null)}>✕</Button>
              </div>
              {eqImportResult.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {eqImportResult.errors.map(e => <li key={e.row} className="text-xs text-destructive">Fila {e.row}: {e.message}</li>)}
                </ul>
              )}
            </div>
          )}
          {client.equipment?.length === 0 ? (
            <EmptyState icon={HardDrive} title="Sin equipos" description="Agregá el primer equipo de este cliente" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {client.equipment?.map((eq) => (
                <Card key={eq.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{eq.name}</CardTitle>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditEquipment(eq); eqForm.reset({ name: eq.name, ip: eq.ip ?? '', brand: eq.brand ?? '', model: eq.model ?? '', location: eq.location ?? '', os: eq.os ?? '' }); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeactivateEquipment(eq)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {eq.brand && <p><span className="text-muted-foreground">Marca:</span> {eq.brand}</p>}
                    {eq.model && <p><span className="text-muted-foreground">Modelo:</span> {eq.model}</p>}
                    {eq.ip && <p><span className="text-muted-foreground">IP:</span> <span className="font-mono">{eq.ip}</span></p>}
                    {eq.location && <p><span className="text-muted-foreground">Ubicación:</span> {eq.location}</p>}
                    {eq.os && <p><span className="text-muted-foreground">SO:</span> {eq.os}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Funcionarios */}
      {tab === 'contacts' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { ctForm.reset(); setCreatingContact(true); }}>
                <Plus className="h-4 w-4" />Agregar funcionario
              </Button>
            </div>
          )}
          {client.contacts?.length === 0 ? (
            <EmptyState icon={Phone} title="Sin funcionarios" description="Agregá los contactos de este cliente" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {client.contacts?.map((ct) => (
                <Card key={ct.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <p className="font-medium">{ct.name}</p>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditContact(ct); ctForm.reset({ name: ct.name, email: ct.email ?? '', phone: ct.phone ?? '' }); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteContact(ct)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      {ct.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{ct.email}</span>
                        </div>
                      )}
                      {ct.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{ct.phone}</span>
                          <a href={whatsappLink(ct.phone)} target="_blank" rel="noopener noreferrer"
                            className="ml-auto rounded bg-green-500 px-2 py-0.5 text-xs text-white hover:bg-green-600">
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Incidentes */}
      {tab === 'incidents' && (
        <div className="space-y-3">
          {client.incidents?.length === 0 ? (
            <EmptyState icon={AlertCircle} title="Sin incidentes" description="Este cliente no tiene incidentes registrados" />
          ) : (
            client.incidents?.map((inc) => (
              <Card key={inc.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/incidents/${inc.id}`)}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{inc.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(inc.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={inc.priority} />
                    <StatusBadge status={inc.status} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab: Cámaras */}
      {tab === 'cameras' && <CamerasTab clientId={client.id} clientName={client.name} />}

      {/* Tab: Backups */}
      {tab === 'backups' && (
        <BackupCalendar clientId={client.id} />
      )}

      {/* Dialogs Equipos */}
      <Dialog open={creatingEquipment || !!editEquipment} onOpenChange={() => { setCreatingEquipment(false); setEditEquipment(null); eqForm.reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editEquipment ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle></DialogHeader>
          <form onSubmit={eqForm.handleSubmit((d) => editEquipment ? updateEqMutation.mutate(d) : createEqMutation.mutate(d))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1"><Label>Nombre *</Label><Input {...eqForm.register('name')} placeholder="Servidor Web" />{eqForm.formState.errors.name && <p className="text-xs text-destructive">{eqForm.formState.errors.name.message}</p>}</div>
              <div className="space-y-1"><Label>Marca</Label><Input {...eqForm.register('brand')} placeholder="Dell" /></div>
              <div className="space-y-1"><Label>Modelo</Label><Input {...eqForm.register('model')} placeholder="PowerEdge R720" /></div>
              <div className="space-y-1"><Label>IP</Label><Input {...eqForm.register('ip')} placeholder="192.168.1.10" /></div>
              <div className="space-y-1"><Label>Sistema operativo</Label><Input {...eqForm.register('os')} placeholder="Ubuntu 22.04" /></div>
              <div className="col-span-2 space-y-1"><Label>Ubicación</Label><Input {...eqForm.register('location')} placeholder="Sala de servidores — Rack 3" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreatingEquipment(false); setEditEquipment(null); eqForm.reset(); }}>Cancelar</Button>
              <Button type="submit" disabled={eqForm.formState.isSubmitting}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deactivateEquipment} onClose={() => setDeactivateEquipment(null)} onConfirm={() => deactivateEquipment && deactivateEqMutation.mutate(deactivateEquipment.id)} title="Desactivar equipo" description={`¿Desactivar "${deactivateEquipment?.name}"?`} confirmLabel="Desactivar" loading={deactivateEqMutation.isPending} />

      {/* Dialogs Funcionarios */}
      <Dialog open={creatingContact || !!editContact} onOpenChange={() => { setCreatingContact(false); setEditContact(null); ctForm.reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editContact ? 'Editar funcionario' : 'Nuevo funcionario'}</DialogTitle></DialogHeader>
          <form onSubmit={ctForm.handleSubmit((d) => editContact ? updateCtMutation.mutate(d) : createCtMutation.mutate(d))} className="space-y-3">
            <div className="space-y-1"><Label>Nombre *</Label><Input {...ctForm.register('name')} placeholder="Juan García" />{ctForm.formState.errors.name && <p className="text-xs text-destructive">{ctForm.formState.errors.name.message}</p>}</div>
            <div className="space-y-1"><Label>Email</Label><Input {...ctForm.register('email')} type="email" placeholder="juan@empresa.com" />{ctForm.formState.errors.email && <p className="text-xs text-destructive">{ctForm.formState.errors.email.message}</p>}</div>
            <div className="space-y-1"><Label>Teléfono</Label><Input {...ctForm.register('phone')} placeholder="099 000 000" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreatingContact(false); setEditContact(null); ctForm.reset(); }}>Cancelar</Button>
              <Button type="submit" disabled={ctForm.formState.isSubmitting}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteContact} onClose={() => setDeleteContact(null)} onConfirm={() => deleteContact && deleteCtMutation.mutate(deleteContact.id)} title="Eliminar funcionario" description={`¿Eliminar a "${deleteContact?.name}"? Esta acción no se puede deshacer.`} confirmLabel="Eliminar" loading={deleteCtMutation.isPending} />

      {/* Dialog edición de información del cliente */}
      <Dialog open={editingInfo} onOpenChange={open => !open && setEditingInfo(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar información de {client?.name}</DialogTitle></DialogHeader>
          <form onSubmit={infoForm.handleSubmit(d => updateInfoMutation.mutate(d))} className="space-y-5">
            {isAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1"><Label>Nombre *</Label><Input {...infoForm.register('name')} />{infoForm.formState.errors.name && <p className="text-xs text-destructive">{infoForm.formState.errors.name.message}</p>}</div>
                <div className="space-y-1"><Label>Ciudad *</Label><Input {...infoForm.register('city')} />{infoForm.formState.errors.city && <p className="text-xs text-destructive">{infoForm.formState.errors.city.message}</p>}</div>
                <div className="space-y-1"><Label>RUT *</Label><Input {...infoForm.register('rut')} />{infoForm.formState.errors.rut && <p className="text-xs text-destructive">{infoForm.formState.errors.rut.message}</p>}</div>
                <div className="space-y-1"><Label>Teléfono *</Label><Input {...infoForm.register('phone')} /></div>
                <div className="space-y-1"><Label>Email</Label><Input {...infoForm.register('email')} type="email" /></div>
                <div className="col-span-2 space-y-1"><Label>Dirección</Label><Input {...infoForm.register('address')} /></div>
                <div className="col-span-2 space-y-1"><Label>Notas</Label><Input {...infoForm.register('notes')} /></div>
              </div>
            )}
            {!isAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Email</Label><Input {...infoForm.register('email')} type="email" /></div>
                <div className="space-y-1"><Label>Dirección</Label><Input {...infoForm.register('address')} /></div>
                <div className="col-span-2 space-y-1"><Label>Notas</Label><Input {...infoForm.register('notes')} /></div>
              </div>
            )}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Red</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>IP pública</Label>
                  <Input {...infoForm.register('publicIp')} placeholder="200.1.2.3" disabled={!!infoForm.watch('dynamicIp')} />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" {...infoForm.register('dynamicIp')} onChange={e => { infoForm.setValue('dynamicIp', e.target.checked); if (e.target.checked) infoForm.setValue('publicIp', ''); }} className="h-3.5 w-3.5" />
                    IP dinámica
                  </label>
                </div>
                <div className="space-y-1"><Label>ISP</Label><Input {...infoForm.register('isp')} /></div>
                <div className="space-y-1"><Label>Rango interno</Label><Input {...infoForm.register('networkRange')} placeholder="192.168.1.0/24" /></div>
              </div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contrato</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Plan</Label><Input {...infoForm.register('servicePlan')} /></div>
                <div className="space-y-1"><Label>Inicio</Label><Input {...infoForm.register('contractStart')} type="date" /></div>
                <div className="space-y-1"><Label>Vencimiento</Label><Input {...infoForm.register('contractEnd')} type="date" /></div>
              </div>
            </div>
            {updateInfoMutation.error && <p className="text-xs text-destructive">Error al guardar. Intentá nuevamente.</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingInfo(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateInfoMutation.isPending}>{updateInfoMutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
