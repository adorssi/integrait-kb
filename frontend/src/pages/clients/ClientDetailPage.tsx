import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Phone, Mail, Monitor, AlertCircle, HardDrive, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientsService } from '@/services/clients.service';
import { backupsService } from '@/services/backups.service';
import { Equipment, Contact } from '@/types';
import { BackupCalendar } from '@/components/BackupCalendar';
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

type Tab = 'info' | 'equipment' | 'contacts' | 'incidents' | 'backups';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('info');

  // Equipment state
  const [editEquipment, setEditEquipment] = useState<Equipment | null>(null);
  const [creatingEquipment, setCreatingEquipment] = useState(false);
  const [deactivateEquipment, setDeactivateEquipment] = useState<Equipment | null>(null);

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
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Nombre', value: client.name },
            { label: 'Ciudad', value: client.city },
            { label: 'RUT', value: client.rut },
            { label: 'Teléfono', value: client.phone },
            { label: 'Creado', value: formatDate(client.createdAt) },
            { label: 'Actualizado', value: formatDate(client.updatedAt) },
          ].map(({ label, value }) => (
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
      )}

      {/* Tab: Equipos */}
      {tab === 'equipment' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { eqForm.reset(); setCreatingEquipment(true); }}>
                <Plus className="h-4 w-4" />Agregar equipo
              </Button>
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
    </div>
  );
}
