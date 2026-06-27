import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Phone, Mail, AlertCircle, HardDrive, Download, Upload, Key, Eye, EyeOff, Loader2, Search, Wifi, FileText, Lock, Globe } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientsService } from '@/services/clients.service';
import { backupsService } from '@/services/backups.service';
import { branchService } from '@/services/branch.service';
import { authService } from '@/services/auth.service';
import { Equipment, Contact, Branch, ClientCredential, ClientWifi, ClientDocument, ClientInternetService } from '@/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatDateTime, formatBytes, whatsappLink, downloadAuthFile } from '@/lib/utils';

// ─── Schemas ────────────────────────────────────────────────────────────────

const equipmentSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  ip: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  os: z.string().optional(),
  notes: z.string().optional(),
  branchId: z.string().optional(),
  hasCredentials: z.boolean().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});
type EquipmentForm = z.infer<typeof equipmentSchema>;

const contactSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
});
type ContactForm = z.infer<typeof contactSchema>;

type Tab = 'info' | 'equipment' | 'contacts' | 'incidents' | 'cameras' | 'backups' | 'branches' | 'credentials' | 'documents';

const clientInfoSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  city: z.string().min(1, 'Ciudad requerida'),
  rut: z.string().min(1, 'RUT requerido'),
  phone: z.string().min(1, 'Teléfono requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  servicePlan: z.string().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  hasBranches: z.boolean().optional(),
  hasCameras: z.boolean().optional(),
  hasBackups: z.boolean().optional(),
});
type ClientInfoForm = z.infer<typeof clientInfoSchema>;

const internetServiceSchema = z.object({
  label: z.string().min(1, 'Etiqueta requerida').default('WAN'),
  ip: z.string().optional(),
  dynamicIp: z.boolean().optional().default(false),
  isp: z.string().optional(),
  serviceNumber: z.string().optional(),
  phone: z.string().optional(),
  titular: z.string().optional(),
});
type InternetServiceForm = z.infer<typeof internetServiceSchema>;

// ─── Credential badge for equipment ─────────────────────────────────────────

interface CredFieldProps { label: string; value: string | null }
function CredField({ label, value }: CredFieldProps) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <span className="flex items-center gap-1 font-mono text-xs">
        {show ? value : '••••••••'}
        <button type="button" onClick={() => setShow(s => !s)} className="text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      </span>
    </div>
  );
}

interface EqCredsBadgeProps { clientId: string; equipmentId: string }
function EqCredsBadge({ clientId, equipmentId }: EqCredsBadgeProps) {
  const [open, setOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyPwd, setVerifyPwd] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['eq-credentials', equipmentId],
    queryFn: () => clientsService.getEquipmentCredentials(clientId, equipmentId),
    enabled: false,
  });

  const handleReveal = () => { setVerifyPwd(''); setVerifyError(''); setVerifyOpen(true); };

  const handleVerify = async () => {
    setVerifying(true); setVerifyError('');
    try {
      await authService.verifyPassword(verifyPwd);
      setVerifyOpen(false); setVerifyPwd('');
      setOpen(true); refetch();
    } catch {
      setVerifyError('Contraseña incorrecta. Intentá de nuevo.');
    } finally { setVerifying(false); }
  };

  return (
    <>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Ver credenciales" onClick={handleReveal}>
        <Key className="h-3 w-3" />
      </Button>

      {/* Diálogo de verificación */}
      <Dialog open={verifyOpen} onOpenChange={(o) => { setVerifyOpen(o); if (!o) setVerifyPwd(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar identidad</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Ingresá tu contraseña del sistema para ver las credenciales del equipo.</p>
          <form autoComplete="off" onSubmit={e => { e.preventDefault(); if (verifyPwd) handleVerify(); }}>
            <input type="text" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} autoComplete="username" readOnly />
            <input type="password" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} autoComplete="current-password" readOnly />
            <div className="space-y-2">
              <Label htmlFor="eq-verify-pwd">Contraseña</Label>
              <Input id="eq-verify-pwd" type="password" value={verifyPwd} onChange={e => setVerifyPwd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verifyPwd && handleVerify()} autoComplete="new-password" />
              {verifyError && <p className="text-xs text-destructive">{verifyError}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setVerifyOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={!verifyPwd || verifying}>
                {verifying ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Verificando...</> : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de credenciales */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Credenciales del equipo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <CredField label="Usuario" value={data?.username ?? null} />
            <CredField label="Contraseña" value={data?.password ?? null} />
          </div>
          <DialogFooter>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

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

  // Equipment filter state
  const [eqSearch, setEqSearch] = useState('');
  const [eqBranchFilter, setEqBranchFilter] = useState<string>('all');
  const [eqOsFilter, setEqOsFilter] = useState<string>('all');

  // Contact state
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [creatingContact, setCreatingContact] = useState(false);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  // Credentials tab state
  const [credSearch, setCredSearch] = useState('');
  const [wifiSearch, setWifiSearch] = useState('');
  const [editCred, setEditCred] = useState<ClientCredential | null>(null);
  const [creatingCred, setCreatingCred] = useState(false);
  const [deleteCred, setDeleteCred] = useState<ClientCredential | null>(null);
  const [editWifi, setEditWifi] = useState<ClientWifi | null>(null);
  const [creatingWifi, setCreatingWifi] = useState(false);
  const [deleteWifi, setDeleteWifi] = useState<ClientWifi | null>(null);
  const [revealCredId, setRevealCredId] = useState<string | null>(null);
  const [revealedCredPwd, setRevealedCredPwd] = useState<string | null>(null);
  const [revealWifiId, setRevealWifiId] = useState<string | null>(null);
  const [revealedWifiPwd, setRevealedWifiPwd] = useState<string | null>(null);
  const [verifyCredOpen, setVerifyCredOpen] = useState<{ type: 'cred' | 'wifi'; id: string } | null>(null);
  const [verifyCredPwd, setVerifyCredPwd] = useState('');
  const [verifyCredError, setVerifyCredError] = useState('');
  const [verifyingCred, setVerifyingCred] = useState(false);

  // Documents tab state
  const [docSearch, setDocSearch] = useState('');
  const [deleteDoc, setDeleteDoc] = useState<ClientDocument | null>(null);
  const docUploadRef = useRef<HTMLInputElement>(null);

  // Internet services state
  const [editInternetSvc, setEditInternetSvc] = useState<ClientInternetService | null>(null);
  const [creatingInternetSvc, setCreatingInternetSvc] = useState(false);
  const [deleteInternetSvc, setDeleteInternetSvc] = useState<ClientInternetService | null>(null);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client-detail', id],
    queryFn: () => clientsService.getDetail(id!),
    enabled: !!id,
  });

  const { data: latestBackup } = useQuery({
    queryKey: ['backup-latest', id],
    queryFn: () => backupsService.latestByClient(id!),
    enabled: !!id && !!client?.hasBackups,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['client-credentials', id],
    queryFn: () => clientsService.listCredentials(id!),
    enabled: !!id && tab === 'credentials',
  });

  const { data: wifiNetworks = [] } = useQuery({
    queryKey: ['client-wifi', id],
    queryFn: () => clientsService.listWifi(id!),
    enabled: !!id && tab === 'credentials',
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['client-documents', id],
    queryFn: () => clientsService.listDocuments(id!),
    enabled: !!id && tab === 'documents',
  });

  const invalidateCreds = () => qc.invalidateQueries({ queryKey: ['client-credentials', id] });
  const invalidateWifi = () => qc.invalidateQueries({ queryKey: ['client-wifi', id] });
  const invalidateDocs = () => qc.invalidateQueries({ queryKey: ['client-documents', id] });
  const invalidateInternetSvcs = () => qc.invalidateQueries({ queryKey: ['client-internet-services', id] });

  const { data: internetServices = [] } = useQuery<ClientInternetService[]>({
    queryKey: ['client-internet-services', id],
    queryFn: () => clientsService.listInternetServices(id!),
    enabled: !!id && tab === 'info',
  });

  const isvcForm = useForm<InternetServiceForm>({ resolver: zodResolver(internetServiceSchema) });
  const showIpField = !isvcForm.watch('dynamicIp');

  const createIsvcMutation = useMutation({
    mutationFn: (d: InternetServiceForm) => clientsService.createInternetService(id!, { ...d, ip: d.dynamicIp ? null : (d.ip || null) }),
    onSuccess: () => { invalidateInternetSvcs(); setCreatingInternetSvc(false); isvcForm.reset(); },
  });
  const updateIsvcMutation = useMutation({
    mutationFn: (d: InternetServiceForm) => clientsService.updateInternetService(id!, editInternetSvc!.id, { ...d, ip: d.dynamicIp ? null : (d.ip || null) }),
    onSuccess: () => { invalidateInternetSvcs(); setEditInternetSvc(null); isvcForm.reset(); },
  });
  const deleteIsvcMutation = useMutation({
    mutationFn: (svcId: string) => clientsService.deleteInternetService(id!, svcId),
    onSuccess: () => { invalidateInternetSvcs(); setDeleteInternetSvc(null); },
  });

  const openCreateIsvc = () => {
    isvcForm.reset({ label: 'WAN', ip: '', dynamicIp: false, isp: '', serviceNumber: '', phone: '', titular: '' });
    setCreatingInternetSvc(true);
  };
  const openEditIsvc = (svc: ClientInternetService) => {
    setEditInternetSvc(svc);
    isvcForm.reset({ label: svc.label, ip: svc.ip ?? '', dynamicIp: svc.dynamicIp, isp: svc.isp ?? '', serviceNumber: svc.serviceNumber ?? '', phone: svc.phone ?? '', titular: svc.titular ?? '' });
  };
  const closeIsvcDialog = () => { setCreatingInternetSvc(false); setEditInternetSvc(null); isvcForm.reset(); };

  const credSchema = z.object({
    service: z.string().min(1, 'Servicio requerido'),
    username: z.string().optional(),
    password: z.string().optional(),
    notes: z.string().optional(),
  });
  type CredForm = z.infer<typeof credSchema>;

  const wifiSchema = z.object({
    ssid: z.string().min(1, 'SSID requerido'),
    password: z.string().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
  });
  type WifiForm = z.infer<typeof wifiSchema>;

  const credForm = useForm<CredForm>({ resolver: zodResolver(credSchema) });
  const wifiForm = useForm<WifiForm>({ resolver: zodResolver(wifiSchema) });

  const createCredMutation = useMutation({
    mutationFn: (d: CredForm) => clientsService.createCredential(id!, d),
    onSuccess: () => { invalidateCreds(); setCreatingCred(false); credForm.reset(); },
  });
  const updateCredMutation = useMutation({
    mutationFn: (d: CredForm) => clientsService.updateCredential(id!, editCred!.id, d),
    onSuccess: () => { invalidateCreds(); setEditCred(null); credForm.reset(); },
  });
  const deleteCredMutation = useMutation({
    mutationFn: (credId: string) => clientsService.deleteCredential(id!, credId),
    onSuccess: () => { invalidateCreds(); setDeleteCred(null); },
  });

  const createWifiMutation = useMutation({
    mutationFn: (d: WifiForm) => clientsService.createWifi(id!, d),
    onSuccess: () => { invalidateWifi(); setCreatingWifi(false); wifiForm.reset(); },
  });
  const updateWifiMutation = useMutation({
    mutationFn: (d: WifiForm) => clientsService.updateWifi(id!, editWifi!.id, d),
    onSuccess: () => { invalidateWifi(); setEditWifi(null); wifiForm.reset(); },
  });
  const deleteWifiMutation = useMutation({
    mutationFn: (wifiId: string) => clientsService.deleteWifi(id!, wifiId),
    onSuccess: () => { invalidateWifi(); setDeleteWifi(null); },
  });

  const uploadDocMutation = useMutation({
    mutationFn: (file: File) => clientsService.uploadDocument(id!, file),
    onSuccess: () => invalidateDocs(),
  });
  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => clientsService.deleteDocument(id!, docId),
    onSuccess: () => { invalidateDocs(); setDeleteDoc(null); },
  });

  const handleVerifyCred = async () => {
    if (!verifyCredOpen) return;
    setVerifyingCred(true); setVerifyCredError('');
    try {
      await authService.verifyPassword(verifyCredPwd);
      const { type, id: itemId } = verifyCredOpen;
      setVerifyCredOpen(null); setVerifyCredPwd('');
      if (type === 'cred') {
        const { password } = await clientsService.getCredentialPassword(id!, itemId);
        setRevealCredId(itemId); setRevealedCredPwd(password);
      } else {
        const { password } = await clientsService.getWifiPassword(id!, itemId);
        setRevealWifiId(itemId); setRevealedWifiPwd(password);
      }
    } catch {
      setVerifyCredError('Contraseña incorrecta. Intentá de nuevo.');
    } finally { setVerifyingCred(false); }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadDocMutation.mutate(file);
    e.target.value = '';
  };

  // Info edit form
  const infoForm = useForm<ClientInfoForm>({ resolver: zodResolver(clientInfoSchema) });
  const updateInfoMutation = useMutation({
    mutationFn: (d: ClientInfoForm) => {
      const nullify = (v: string | undefined) => (v === '' ? null : v ?? null);
      const payload = {
        ...d,
        email: nullify(d.email),
        address: nullify(d.address),
        notes: nullify(d.notes),
        servicePlan: nullify(d.servicePlan),
        contractStart: nullify(d.contractStart),
        contractEnd: nullify(d.contractEnd),
        hasBranches: d.hasBranches ?? false,
        hasCameras: d.hasCameras ?? false,
        hasBackups: d.hasBackups ?? false,
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
      servicePlan: client.servicePlan ?? '',
      contractStart: client.contractStart?.slice(0, 10) ?? '',
      contractEnd: client.contractEnd?.slice(0, 10) ?? '',
      hasBranches: client.hasBranches,
      hasCameras: client.hasCameras,
      hasBackups: client.hasBackups,
    });
    setEditingInfo(true);
  };

  // Equipment forms
  const eqForm = useForm<EquipmentForm>({ resolver: zodResolver(equipmentSchema) });
  const showEqCredFields = eqForm.watch('hasCredentials');

  const openCreateEq = () => {
    eqForm.reset({ name: '', ip: '', brand: '', model: '', location: '', os: '', notes: '', branchId: '', hasCredentials: false, username: '', password: '' });
    setCreatingEquipment(true);
  };
  const openEditEq = (eq: Equipment) => {
    setEditEquipment(eq);
    eqForm.reset({
      name: eq.name, ip: eq.ip ?? '', brand: eq.brand ?? '', model: eq.model ?? '',
      location: eq.location ?? '', os: eq.os ?? '', notes: eq.notes ?? '',
      branchId: eq.branchId ?? '',
      hasCredentials: eq.hasCredentials, username: '', password: '',
    });
  };
  const closeEqDialog = () => { setCreatingEquipment(false); setEditEquipment(null); eqForm.reset(); };

  const createEqMutation = useMutation({
    mutationFn: (d: EquipmentForm) => clientsService.createEquipment(id!, {
      name: d.name, ip: d.ip, brand: d.brand, model: d.model, location: d.location,
      os: d.os, notes: d.notes,
      branchId: d.branchId || null,
      ...(d.hasCredentials ? { username: d.username, password: d.password } : {}),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-detail', id] }); closeEqDialog(); },
  });

  const updateEqMutation = useMutation({
    mutationFn: (d: EquipmentForm) => clientsService.updateEquipment(id!, editEquipment!.id, {
      name: d.name, ip: d.ip, brand: d.brand, model: d.model, location: d.location,
      os: d.os, notes: d.notes,
      branchId: d.branchId || null,
      // Si el checkbox está desactivado, borra credenciales. Si está activo y hay valores, actualiza.
      username: d.hasCredentials ? (d.username || undefined) : null,
      password: d.hasCredentials ? (d.password || undefined) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-detail', id] }); closeEqDialog(); },
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

  // ── Equipment filter ──
  const allEquipment = client.equipment ?? [];
  const branches: Branch[] = client.branches ?? [];
  const uniqueOsList = [...new Set(allEquipment.map(e => e.os).filter(Boolean))] as string[];
  const filteredEquipment = allEquipment.filter(eq => {
    const searchLower = eqSearch.toLowerCase();
    const matchesSearch = !eqSearch || eq.name.toLowerCase().includes(searchLower) || (eq.ip ?? '').includes(eqSearch);
    const matchesBranch = eqBranchFilter === 'all' || eq.branchId === eqBranchFilter || (eqBranchFilter === 'none' && !eq.branchId);
    const matchesOs = eqOsFilter === 'all' || eq.os === eqOsFilter;
    return matchesSearch && matchesBranch && matchesOs;
  });

  // ── Tabs dinámicos ──
  const BACKUP_DOT: Record<'SUCCESS' | 'WARNING' | 'FAILURE', string> = {
    SUCCESS: 'bg-green-500', WARNING: 'bg-yellow-400', FAILURE: 'bg-red-500',
  };

  const TABS: { key: Tab; label: React.ReactNode }[] = [
    { key: 'info', label: 'Información' },
    { key: 'equipment', label: `Equipos (${allEquipment.length})` },
    { key: 'contacts', label: `Funcionarios (${client.contacts?.length ?? 0})` },
    { key: 'incidents', label: `Incidentes (${client.incidents?.length ?? 0})` },
    { key: 'credentials', label: 'Credenciales' },
    { key: 'documents', label: 'Documentos' },
    ...(client.hasBranches ? [{ key: 'branches' as Tab, label: 'Sucursales' }] : []),
    ...(client.hasCameras ? [{ key: 'cameras' as Tab, label: 'Cámaras' }] : []),
    ...(client.hasBackups ? [{
      key: 'backups' as Tab,
      label: (
        <span className="flex items-center gap-1.5">
          Backups
          {latestBackup && (
            <span className={`inline-block w-2 h-2 rounded-full ${BACKUP_DOT[latestBackup.result]}`} title={latestBackup.result} />
          )}
        </span>
      ),
    }] : []),
  ];

  // Si el tab actual ya no está disponible, volver a info
  const validTab = TABS.some(t => t.key === tab) ? tab : 'info';
  if (validTab !== tab) setTab('info');

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
      <div className="flex gap-1 border-b flex-wrap">
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

          {/* Servicios de Internet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />Servicios de Internet
              </h3>
              <Button size="sm" variant="outline" onClick={openCreateIsvc}><Plus className="h-3.5 w-3.5" />Agregar</Button>
            </div>
            {internetServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin servicios de internet registrados.</p>
            ) : (
              <div className="space-y-2">
                {internetServices.map(svc => (
                  <Card key={svc.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-start gap-3 min-w-0">
                          <Badge variant="secondary" className="shrink-0">{svc.label}</Badge>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                            {svc.dynamicIp ? (
                              <div><span className="text-xs text-muted-foreground block">IP pública</span><span className="text-yellow-600 dark:text-yellow-400">Dinámica</span></div>
                            ) : svc.ip ? (
                              <div><span className="text-xs text-muted-foreground block">IP pública</span><span className="font-mono">{svc.ip}</span></div>
                            ) : null}
                            {svc.isp && <div><span className="text-xs text-muted-foreground block">ISP</span>{svc.isp}</div>}
                            {svc.serviceNumber && <div><span className="text-xs text-muted-foreground block">Nro. de servicio</span>{svc.serviceNumber}</div>}
                            {svc.phone && <div><span className="text-xs text-muted-foreground block">Teléfono</span>{svc.phone}</div>}
                            {svc.titular && <div><span className="text-xs text-muted-foreground block">Titular</span>{svc.titular}</div>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditIsvc(svc)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteInternetSvc(svc)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {(client.servicePlan || client.contractStart || client.contractEnd) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Contrato</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Plan', value: client.servicePlan },
                  { label: 'Inicio', value: client.contractStart ? formatDate(client.contractStart) : null },
                  { label: 'Vencimiento', value: client.contractEnd ? formatDate(client.contractEnd) : null },
                ].filter(f => f.value).map(({ label, value }) => (
                  <Card key={label}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></CardContent></Card>
                ))}
              </div>
            </div>
          )}

          {/* Módulos habilitados */}
          {(client.hasBranches || client.hasCameras || client.hasBackups) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Módulos activos</h3>
              <div className="flex gap-2 flex-wrap">
                {client.hasBranches && <Badge variant="secondary">Sucursales</Badge>}
                {client.hasCameras && <Badge variant="secondary">Cámaras</Badge>}
                {client.hasBackups && <Badge variant="secondary">Backups</Badge>}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button size="sm" variant="outline" onClick={openInfoEdit}><Pencil className="h-4 w-4" />Editar información</Button>
          </div>
        </div>
      )}

      {/* Tab: Sucursales */}
      {tab === 'branches' && client.hasBranches && <BranchesTab clientId={client.id} equipment={allEquipment} />}

      {/* Tab: Equipos */}
      {tab === 'equipment' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => exportEquipmentTemplate(client.name)}>
                <Download className="h-4 w-4" />Template Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportEquipmentData(client.equipment ?? [], client.name)} disabled={allEquipment.length === 0}>
                <Download className="h-4 w-4" />Exportar datos
              </Button>
              <Button size="sm" variant="outline" onClick={() => eqImportRef.current?.click()} disabled={importEqMutation.isPending}>
                <Upload className="h-4 w-4" />{importEqMutation.isPending ? 'Importando...' : 'Importar Excel'}
              </Button>
              <input ref={eqImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleEqImport} />
            </div>
            <Button size="sm" onClick={openCreateEq}><Plus className="h-4 w-4" />Agregar equipo</Button>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder="Buscar nombre o IP..." className="pl-9 w-52" value={eqSearch} onChange={e => setEqSearch(e.target.value)} autoComplete="off" />
            </div>
            {branches.length > 0 && (
              <Select value={eqBranchFilter} onValueChange={setEqBranchFilter}>
                <SelectTrigger className="w-44 bg-background"><SelectValue placeholder="Todas las sucursales" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  <SelectItem value="none">Sin sucursal</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {uniqueOsList.length > 0 && (
              <Select value={eqOsFilter} onValueChange={setEqOsFilter}>
                <SelectTrigger className="w-44 bg-background"><SelectValue placeholder="Todos los SO" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los SO</SelectItem>
                  {uniqueOsList.map(os => <SelectItem key={os} value={os}>{os}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {(eqSearch || eqBranchFilter !== 'all' || eqOsFilter !== 'all') && (
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setEqSearch(''); setEqBranchFilter('all'); setEqOsFilter('all'); }}>
                Limpiar filtros
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

          {filteredEquipment.length === 0 ? (
            allEquipment.length === 0
              ? <EmptyState icon={HardDrive} title="Sin equipos" description="Agregá el primer equipo de este cliente" />
              : <p className="text-sm text-muted-foreground py-8 text-center">No hay equipos que coincidan con los filtros.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEquipment.map((eq) => (
                <Card key={eq.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{eq.name}</CardTitle>
                      <div className="flex gap-1 shrink-0">
                        {eq.hasCredentials && <EqCredsBadge clientId={id!} equipmentId={eq.id} />}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEq(eq)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeactivateEquipment(eq)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {eq.brand && <p><span className="text-muted-foreground">Marca:</span> {eq.brand}</p>}
                    {eq.model && <p><span className="text-muted-foreground">Modelo:</span> {eq.model}</p>}
                    {eq.ip && <p><span className="text-muted-foreground">IP:</span> <span className="font-mono">{eq.ip}</span></p>}
                    {eq.location && <p><span className="text-muted-foreground">Ubicación:</span> {eq.location}</p>}
                    {eq.os && <p><span className="text-muted-foreground">SO:</span> {eq.os}</p>}
                    {eq.notes && <p className="text-muted-foreground text-xs pt-1">{eq.notes}</p>}
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
                          <Mail className="h-3 w-3" /><span className="truncate">{ct.email}</span>
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
      {tab === 'cameras' && client.hasCameras && <CamerasTab clientId={client.id} clientName={client.name} />}

      {/* Tab: Backups */}
      {tab === 'backups' && client.hasBackups && <BackupCalendar clientId={client.id} />}

      {/* Tab: Credenciales (cuentas + WiFi) */}
      {tab === 'credentials' && (
        <div className="space-y-8">
          {/* Sección: Cuentas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Cuentas</h3>
              <Button size="sm" onClick={() => { credForm.reset(); setCreatingCred(true); }}><Plus className="h-4 w-4" />Agregar cuenta</Button>
            </div>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder="Buscar servicio..." className="pl-9" value={credSearch} onChange={e => setCredSearch(e.target.value)} />
            </div>
            {credentials.filter(c => !credSearch || c.service.toLowerCase().includes(credSearch.toLowerCase()) || (c.username ?? '').toLowerCase().includes(credSearch.toLowerCase())).length === 0 ? (
              <EmptyState icon={Lock} title="Sin cuentas" description="Agregá credenciales de servicios externos (Dropbox, Microsoft 365, etc.)" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {credentials.filter(c => !credSearch || c.service.toLowerCase().includes(credSearch.toLowerCase()) || (c.username ?? '').toLowerCase().includes(credSearch.toLowerCase())).map(cred => (
                  <Card key={cred.id}>
                    <CardContent className="pt-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{cred.service}</p>
                        <div className="flex gap-1 shrink-0">
                          {cred.hasPassword && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver contraseña"
                              onClick={() => { setRevealCredId(null); setRevealedCredPwd(null); setVerifyCredPwd(''); setVerifyCredError(''); setVerifyCredOpen({ type: 'cred', id: cred.id }); }}>
                              <Key className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditCred(cred); credForm.reset({ service: cred.service, username: cred.username ?? '', notes: cred.notes ?? '' }); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteCred(cred)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {cred.username && <p className="text-xs text-muted-foreground">Usuario: <span className="font-mono text-foreground">{cred.username}</span></p>}
                      {revealCredId === cred.id && revealedCredPwd !== null && (
                        <p className="text-xs text-muted-foreground">Contraseña: <span className="font-mono text-foreground">{revealedCredPwd || '—'}</span>
                          <button type="button" className="ml-2 text-xs underline text-muted-foreground" onClick={() => { setRevealCredId(null); setRevealedCredPwd(null); }}>ocultar</button>
                        </p>
                      )}
                      {cred.notes && <p className="text-xs text-muted-foreground italic">{cred.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sección: WiFi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5" />Redes WiFi</h3>
              <Button size="sm" onClick={() => { wifiForm.reset(); setCreatingWifi(true); }}><Plus className="h-4 w-4" />Agregar WiFi</Button>
            </div>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder="Buscar SSID..." className="pl-9" value={wifiSearch} onChange={e => setWifiSearch(e.target.value)} />
            </div>
            {wifiNetworks.filter(w => !wifiSearch || w.ssid.toLowerCase().includes(wifiSearch.toLowerCase()) || (w.location ?? '').toLowerCase().includes(wifiSearch.toLowerCase())).length === 0 ? (
              <EmptyState icon={Wifi} title="Sin redes WiFi" description="Guardá SSIDs y contraseñas de las redes del cliente" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {wifiNetworks.filter(w => !wifiSearch || w.ssid.toLowerCase().includes(wifiSearch.toLowerCase()) || (w.location ?? '').toLowerCase().includes(wifiSearch.toLowerCase())).map(wifi => (
                  <Card key={wifi.id}>
                    <CardContent className="pt-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm font-mono">{wifi.ssid}</p>
                        <div className="flex gap-1 shrink-0">
                          {wifi.hasPassword && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver contraseña"
                              onClick={() => { setRevealWifiId(null); setRevealedWifiPwd(null); setVerifyCredPwd(''); setVerifyCredError(''); setVerifyCredOpen({ type: 'wifi', id: wifi.id }); }}>
                              <Key className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditWifi(wifi); wifiForm.reset({ ssid: wifi.ssid, location: wifi.location ?? '', notes: wifi.notes ?? '' }); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteWifi(wifi)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {wifi.location && <p className="text-xs text-muted-foreground">{wifi.location}</p>}
                      {revealWifiId === wifi.id && revealedWifiPwd !== null && (
                        <p className="text-xs text-muted-foreground">Contraseña: <span className="font-mono text-foreground">{revealedWifiPwd || '—'}</span>
                          <button type="button" className="ml-2 text-xs underline text-muted-foreground" onClick={() => { setRevealWifiId(null); setRevealedWifiPwd(null); }}>ocultar</button>
                        </p>
                      )}
                      {wifi.notes && <p className="text-xs text-muted-foreground italic">{wifi.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Documentos */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder="Buscar documento..." className="pl-9" value={docSearch} onChange={e => setDocSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              {uploadDocMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Button size="sm" onClick={() => docUploadRef.current?.click()} disabled={uploadDocMutation.isPending}>
                <Upload className="h-4 w-4" />Subir documento
              </Button>
              <input ref={docUploadRef} type="file" className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleDocUpload} />
            </div>
          </div>

          {documents.filter(d => !docSearch || d.filename.toLowerCase().includes(docSearch.toLowerCase())).length === 0 ? (
            <EmptyState icon={FileText} title="Sin documentos" description="Subí planos, cotizaciones, PDFs de licencias y otros archivos del cliente" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.filter(d => !docSearch || d.filename.toLowerCase().includes(docSearch.toLowerCase())).map(doc => (
                <Card key={doc.id}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium truncate">{doc.filename}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Descargar"
                          onClick={() => { void downloadAuthFile(clientsService.getDocumentDownloadUrl(id!, doc.id), doc.filename); }}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteDoc(doc)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatBytes(doc.size)} · {formatDate(doc.uploadedAt)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs Equipos ── */}
      <Dialog open={creatingEquipment || !!editEquipment} onOpenChange={closeEqDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editEquipment ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle></DialogHeader>
          <form onSubmit={eqForm.handleSubmit((d) => editEquipment ? updateEqMutation.mutate(d) : createEqMutation.mutate(d))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nombre *</Label>
                <Input {...eqForm.register('name')} placeholder="Servidor Web" />
                {eqForm.formState.errors.name && <p className="text-xs text-destructive">{eqForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1"><Label>Marca</Label><Input {...eqForm.register('brand')} placeholder="Dell" /></div>
              <div className="space-y-1"><Label>Modelo</Label><Input {...eqForm.register('model')} placeholder="PowerEdge R720" /></div>
              <div className="space-y-1"><Label>IP</Label><Input {...eqForm.register('ip')} placeholder="192.168.1.10" /></div>
              <div className="space-y-1"><Label>Sistema operativo</Label><Input {...eqForm.register('os')} placeholder="Ubuntu 22.04" /></div>
              <div className="col-span-2 space-y-1"><Label>Ubicación</Label><Input {...eqForm.register('location')} placeholder="Sala de servidores — Rack 3" /></div>
              {branches.length > 0 && (
                <div className="col-span-2 space-y-1">
                  <Label>Sucursal</Label>
                  <Select value={eqForm.watch('branchId') ?? ''} onValueChange={v => eqForm.setValue('branchId', v === 'none' ? '' : v)}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Sin sucursal" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin sucursal</SelectItem>
                      {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2 space-y-1">
                <Label>Notas</Label>
                <Input {...eqForm.register('notes')} placeholder="Texto libre sobre el equipo..." />
              </div>
            </div>

            {/* Credenciales */}
            <div className="border-t pt-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" {...eqForm.register('hasCredentials')} className="h-4 w-4" />
                <span className="text-sm font-medium">Credenciales</span>
              </label>
              {showEqCredFields && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <p className="col-span-2 text-xs text-muted-foreground">
                    {editEquipment ? 'Dejá vacío para mantener las credenciales actuales.' : 'Las credenciales se almacenan cifradas.'}
                  </p>
                  <div className="space-y-1">
                    <Label>Usuario</Label>
                    <Input {...eqForm.register('username')} autoComplete="off" placeholder="admin" />
                  </div>
                  <div className="space-y-1">
                    <Label>Contraseña</Label>
                    <Input {...eqForm.register('password')} type="password" autoComplete="new-password" placeholder="••••••••" />
                  </div>
                </div>
              )}
            </div>

            {(createEqMutation.error || updateEqMutation.error) && (
              <p className="text-xs text-destructive">Error al guardar. Verificá los datos e intentá nuevamente.</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEqDialog}>Cancelar</Button>
              <Button type="submit" disabled={eqForm.formState.isSubmitting || createEqMutation.isPending || updateEqMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deactivateEquipment} onClose={() => setDeactivateEquipment(null)}
        onConfirm={() => deactivateEquipment && deactivateEqMutation.mutate(deactivateEquipment.id)}
        title="Desactivar equipo" description={`¿Desactivar "${deactivateEquipment?.name}"?`}
        confirmLabel="Desactivar" loading={deactivateEqMutation.isPending} />

      {/* ── Dialogs Funcionarios ── */}
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

      <ConfirmDialog open={!!deleteContact} onClose={() => setDeleteContact(null)}
        onConfirm={() => deleteContact && deleteCtMutation.mutate(deleteContact.id)}
        title="Eliminar funcionario" description={`¿Eliminar a "${deleteContact?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar" loading={deleteCtMutation.isPending} />

      {/* ── Dialogs Credenciales ── */}
      <Dialog open={creatingCred || !!editCred} onOpenChange={open => { if (!open) { setCreatingCred(false); setEditCred(null); credForm.reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCred ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle></DialogHeader>
          <form onSubmit={credForm.handleSubmit(d => editCred ? updateCredMutation.mutate(d) : createCredMutation.mutate(d))} className="space-y-3">
            <div className="space-y-1"><Label>Servicio *</Label><Input {...credForm.register('service')} placeholder="Dropbox, Microsoft 365, Google Workspace..." />{credForm.formState.errors.service && <p className="text-xs text-destructive">{credForm.formState.errors.service.message}</p>}</div>
            <div className="space-y-1"><Label>Usuario</Label><Input {...credForm.register('username')} placeholder="usuario@empresa.com" autoComplete="off" /></div>
            <div className="space-y-1"><Label>Contraseña</Label><Input {...credForm.register('password')} type="password" autoComplete="new-password" placeholder={editCred ? 'Dejá vacío para mantener la actual' : '••••••••'} /></div>
            <div className="space-y-1"><Label>Notas</Label><Input {...credForm.register('notes')} placeholder="Plan, vencimiento, observaciones..." /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreatingCred(false); setEditCred(null); credForm.reset(); }}>Cancelar</Button>
              <Button type="submit" disabled={createCredMutation.isPending || updateCredMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteCred} onClose={() => setDeleteCred(null)}
        onConfirm={() => deleteCred && deleteCredMutation.mutate(deleteCred.id)}
        title="Eliminar cuenta" description={`¿Eliminar la cuenta de "${deleteCred?.service}"?`}
        confirmLabel="Eliminar" loading={deleteCredMutation.isPending} />

      {/* ── Dialogs WiFi ── */}
      <Dialog open={creatingWifi || !!editWifi} onOpenChange={open => { if (!open) { setCreatingWifi(false); setEditWifi(null); wifiForm.reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editWifi ? 'Editar red WiFi' : 'Nueva red WiFi'}</DialogTitle></DialogHeader>
          <form onSubmit={wifiForm.handleSubmit(d => editWifi ? updateWifiMutation.mutate(d) : createWifiMutation.mutate(d))} className="space-y-3">
            <div className="space-y-1"><Label>SSID *</Label><Input {...wifiForm.register('ssid')} placeholder="MiRed-5G" />{wifiForm.formState.errors.ssid && <p className="text-xs text-destructive">{wifiForm.formState.errors.ssid.message}</p>}</div>
            <div className="space-y-1"><Label>Contraseña</Label><Input {...wifiForm.register('password')} type="password" autoComplete="new-password" placeholder={editWifi ? 'Dejá vacío para mantener la actual' : '••••••••'} /></div>
            <div className="space-y-1"><Label>Ubicación</Label><Input {...wifiForm.register('location')} placeholder="Oficina principal, Sala de reuniones..." /></div>
            <div className="space-y-1"><Label>Notas</Label><Input {...wifiForm.register('notes')} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreatingWifi(false); setEditWifi(null); wifiForm.reset(); }}>Cancelar</Button>
              <Button type="submit" disabled={createWifiMutation.isPending || updateWifiMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteWifi} onClose={() => setDeleteWifi(null)}
        onConfirm={() => deleteWifi && deleteWifiMutation.mutate(deleteWifi.id)}
        title="Eliminar red WiFi" description={`¿Eliminar la red "${deleteWifi?.ssid}"?`}
        confirmLabel="Eliminar" loading={deleteWifiMutation.isPending} />

      {/* ── Dialog confirmar identidad para credenciales/WiFi ── */}
      <Dialog open={!!verifyCredOpen} onOpenChange={open => { if (!open) { setVerifyCredOpen(null); setVerifyCredPwd(''); setVerifyCredError(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar identidad</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Ingresá tu contraseña para ver las credenciales.</p>
          <form autoComplete="off" onSubmit={e => { e.preventDefault(); if (verifyCredPwd) handleVerifyCred(); }}>
            <input type="text" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} autoComplete="username" readOnly />
            <input type="password" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} autoComplete="current-password" readOnly />
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input type="password" value={verifyCredPwd} onChange={e => setVerifyCredPwd(e.target.value)} autoComplete="new-password" />
              {verifyCredError && <p className="text-xs text-destructive">{verifyCredError}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => { setVerifyCredOpen(null); setVerifyCredPwd(''); }}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={!verifyCredPwd || verifyingCred}>
                {verifyingCred ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Verificando...</> : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog confirmar eliminar documento ── */}
      <ConfirmDialog open={!!deleteDoc} onClose={() => setDeleteDoc(null)}
        onConfirm={() => deleteDoc && deleteDocMutation.mutate(deleteDoc.id)}
        title="Eliminar documento" description={`¿Eliminar "${deleteDoc?.filename}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar" loading={deleteDocMutation.isPending} />

      {/* ── Dialog crear/editar servicio de internet ── */}
      <Dialog open={creatingInternetSvc || !!editInternetSvc} onOpenChange={open => !open && closeIsvcDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editInternetSvc ? 'Editar servicio de internet' : 'Agregar servicio de internet'}</DialogTitle></DialogHeader>
          <form onSubmit={isvcForm.handleSubmit(d => editInternetSvc ? updateIsvcMutation.mutate(d) : createIsvcMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Etiqueta *</Label>
                <Input {...isvcForm.register('label')} list="isvc-label-list" placeholder="WAN" />
                <datalist id="isvc-label-list">
                  <option value="WAN" />
                  <option value="LAN TO LAN" />
                  <option value="MPLS" />
                  <option value="FIBRA" />
                  <option value="ADSL" />
                  <option value="4G/LTE" />
                </datalist>
                {isvcForm.formState.errors.label && <p className="text-xs text-destructive">{isvcForm.formState.errors.label.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>IP pública</Label>
                <Input {...isvcForm.register('ip')} placeholder="200.1.2.3" disabled={!showIpField} />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" {...isvcForm.register('dynamicIp')} onChange={e => { isvcForm.setValue('dynamicIp', e.target.checked); if (e.target.checked) isvcForm.setValue('ip', ''); }} className="h-3.5 w-3.5" />
                  IP dinámica
                </label>
              </div>
              <div className="space-y-1"><Label>ISP</Label><Input {...isvcForm.register('isp')} placeholder="Antel, Claro..." /></div>
              <div className="space-y-1"><Label>Nro. de servicio</Label><Input {...isvcForm.register('serviceNumber')} placeholder="123456789" /></div>
              <div className="space-y-1"><Label>Teléfono soporte</Label><Input {...isvcForm.register('phone')} placeholder="0800 123 456" /></div>
              <div className="space-y-1"><Label>Titular del servicio</Label><Input {...isvcForm.register('titular')} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeIsvcDialog}>Cancelar</Button>
              <Button type="submit" disabled={createIsvcMutation.isPending || updateIsvcMutation.isPending}>
                {(createIsvcMutation.isPending || updateIsvcMutation.isPending) ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog confirmar eliminar servicio de internet ── */}
      <ConfirmDialog open={!!deleteInternetSvc} onClose={() => setDeleteInternetSvc(null)}
        onConfirm={() => deleteInternetSvc && deleteIsvcMutation.mutate(deleteInternetSvc.id)}
        title="Eliminar servicio de internet" description={`¿Eliminar el servicio "${deleteInternetSvc?.label}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar" loading={deleteIsvcMutation.isPending} />

      {/* ── Dialog edición de información del cliente ── */}
      <Dialog open={editingInfo} onOpenChange={open => !open && setEditingInfo(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar información de {client?.name}</DialogTitle></DialogHeader>
          <form onSubmit={infoForm.handleSubmit(d => updateInfoMutation.mutate(d))} className="space-y-5">
            {isAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1"><Label>Nombre *</Label><Input {...infoForm.register('name')} />{infoForm.formState.errors.name && <p className="text-xs text-destructive">{infoForm.formState.errors.name.message}</p>}</div>
                <div className="space-y-1"><Label>Ciudad *</Label><Input {...infoForm.register('city')} /></div>
                <div className="space-y-1"><Label>RUT *</Label><Input {...infoForm.register('rut')} /></div>
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contrato</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Plan</Label><Input {...infoForm.register('servicePlan')} /></div>
                <div className="space-y-1"><Label>Inicio</Label><Input {...infoForm.register('contractStart')} type="date" /></div>
                <div className="space-y-1"><Label>Vencimiento</Label><Input {...infoForm.register('contractEnd')} type="date" /></div>
              </div>
            </div>
            {isAdmin && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Módulos opcionales</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" {...infoForm.register('hasBranches')} className="h-4 w-4" />
                    <span className="text-sm">Sucursales — habilita la pestaña de gestión de sucursales y segmentos de red</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" {...infoForm.register('hasCameras')} className="h-4 w-4" />
                    <span className="text-sm">Cámaras — habilita NVRs y cámaras de vigilancia</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" {...infoForm.register('hasBackups')} className="h-4 w-4" />
                    <span className="text-sm">Backups — habilita el calendario de estado de backups</span>
                  </label>
                </div>
              </div>
            )}
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
