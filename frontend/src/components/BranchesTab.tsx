import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2, ChevronDown, ChevronRight, Monitor, Network, Pencil, Plus, Trash2, Wifi,
} from 'lucide-react';
import { Branch, Equipment, NetworkSegment } from '@/types';
import { branchService } from '@/services/branch.service';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';

const branchSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  address: z.string().optional(),
  publicIp: z.string().optional(),
  dynamicIp: z.boolean().optional(),
  isp: z.string().optional(),
});
type BranchForm = z.infer<typeof branchSchema>;

const segmentSchema = z.object({
  vlan: z.coerce.number().int().min(1).max(4094).optional().or(z.literal('')),
  networkRange: z.string().min(1, 'Rango requerido (ej: 192.168.10.0/24)'),
  description: z.string().optional(),
});
type SegmentForm = z.infer<typeof segmentSchema>;

export function BranchesTab({ clientId, equipment = [] }: { clientId: string; equipment?: Equipment[] }) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);
  const [segmentTarget, setSegmentTarget] = useState<{ branchId: string; segment?: NetworkSegment } | null>(null);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches', clientId],
    queryFn: () => branchService.list(clientId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['branches', clientId] });

  const bForm = useForm<BranchForm>({ resolver: zodResolver(branchSchema) });
  const createBranchMutation = useMutation({
    mutationFn: (d: BranchForm) => branchService.create(clientId, nullifyForm(d)),
    onSuccess: () => { invalidate(); setCreatingBranch(false); bForm.reset(); },
  });
  const updateBranchMutation = useMutation({
    mutationFn: (d: BranchForm) => branchService.update(clientId, editBranch!.id, nullifyForm(d)),
    onSuccess: () => { invalidate(); setEditBranch(null); bForm.reset(); },
  });
  const deleteBranchMutation = useMutation({
    mutationFn: () => branchService.deactivate(clientId, deleteBranch!.id),
    onSuccess: () => { invalidate(); setDeleteBranch(null); },
  });

  const sForm = useForm<SegmentForm>({ resolver: zodResolver(segmentSchema) });
  const createSegmentMutation = useMutation({
    mutationFn: (d: SegmentForm) => branchService.createSegment(clientId, segmentTarget!.branchId, {
      vlan: d.vlan === '' || d.vlan === undefined ? null : Number(d.vlan),
      networkRange: d.networkRange,
      description: d.description || null,
    }),
    onSuccess: () => { invalidate(); setSegmentTarget(null); sForm.reset(); },
  });
  const updateSegmentMutation = useMutation({
    mutationFn: (d: SegmentForm) => branchService.updateSegment(clientId, segmentTarget!.branchId, segmentTarget!.segment!.id, {
      vlan: d.vlan === '' || d.vlan === undefined ? null : Number(d.vlan),
      networkRange: d.networkRange,
      description: d.description || null,
    }),
    onSuccess: () => { invalidate(); setSegmentTarget(null); sForm.reset(); },
  });
  const deleteSegmentMutation = useMutation({
    mutationFn: ({ branchId, segmentId }: { branchId: string; segmentId: string }) =>
      branchService.deleteSegment(clientId, branchId, segmentId),
    onSuccess: () => invalidate(),
  });

  const nullifyForm = (d: BranchForm) => ({
    ...d,
    address: d.address || null,
    publicIp: d.publicIp || null,
    isp: d.isp || null,
  });

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const openCreateBranch = () => { bForm.reset({ name: '', address: '', publicIp: '', dynamicIp: false, isp: '' }); setCreatingBranch(true); };
  const openEditBranch = (b: Branch) => {
    bForm.reset({ name: b.name, address: b.address ?? '', publicIp: b.publicIp ?? '', dynamicIp: b.dynamicIp, isp: b.isp ?? '' });
    setEditBranch(b);
  };
  const openCreateSegment = (branchId: string) => { sForm.reset({ vlan: '', networkRange: '', description: '' }); setSegmentTarget({ branchId }); };
  const openEditSegment = (branchId: string, seg: NetworkSegment) => {
    sForm.reset({ vlan: seg.vlan ?? '', networkRange: seg.networkRange, description: seg.description ?? '' });
    setSegmentTarget({ branchId, segment: seg });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {branches.length} sucursal{branches.length !== 1 ? 'es' : ''}
        </p>
        <Button size="sm" onClick={openCreateBranch}>
          <Plus className="h-4 w-4" />Nueva sucursal
        </Button>
      </div>

      {branches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin sucursales registradas"
          description="Registrá las sucursales y sus segmentos de red"
          action={<Button size="sm" onClick={openCreateBranch}><Plus className="h-4 w-4" />Nueva sucursal</Button>}
        />
      ) : (
        branches.map(branch => (
          <Card key={branch.id}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex items-center gap-2 text-left flex-1"
                  onClick={() => toggle(branch.id)}
                >
                  {expanded.has(branch.id)
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{branch.name}</span>
                  {branch.address && <span className="text-xs text-muted-foreground">{branch.address}</span>}
                  {branch.dynamicIp
                    ? <Badge variant="outline" className="text-xs">IP dinámica</Badge>
                    : branch.publicIp && <Badge variant="outline" className="font-mono text-xs">{branch.publicIp}</Badge>}
                  {branch.isp && <span className="text-xs text-muted-foreground">{branch.isp}</span>}
                  <Badge variant="secondary" className="text-xs">
                    {branch.segments.length} VLAN{branch.segments.length !== 1 ? 's' : ''}
                  </Badge>
                </button>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => openEditBranch(branch)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {isAdmin && (
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteBranch(branch)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {expanded.has(branch.id) && (
              <CardContent className="pt-0 pb-3 px-4">
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      <Network className="h-3.5 w-3.5" />Segmentos de red
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => openCreateSegment(branch.id)}>
                      <Plus className="h-3 w-3" />Agregar VLAN
                    </Button>
                  </div>

                  {branch.segments.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-1">Sin segmentos registrados</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b">
                          <th className="text-left py-1">VLAN</th>
                          <th className="text-left py-1">Rango</th>
                          <th className="text-left py-1">Descripción</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {branch.segments.map(seg => (
                          <tr key={seg.id} className="hover:bg-muted/20">
                            <td className="py-1.5">
                              {seg.vlan
                                ? <Badge variant="secondary" className="font-mono text-xs">VLAN {seg.vlan}</Badge>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="py-1.5 font-mono text-xs text-primary">{seg.networkRange}</td>
                            <td className="py-1.5 text-xs text-muted-foreground">{seg.description ?? '—'}</td>
                            <td className="py-1.5">
                              <div className="flex items-center gap-1 justify-end">
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditSegment(branch.id, seg)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                                  onClick={() => deleteSegmentMutation.mutate({ branchId: branch.id, segmentId: seg.id })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Equipos de la sucursal */}
                  {(() => {
                    const branchEquipment = equipment.filter(e => e.branchId === branch.id);
                    return (
                      <div className="mt-3 border-t pt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                          <Monitor className="h-3.5 w-3.5" />Equipos asignados
                          <Badge variant="secondary" className="text-xs ml-1">{branchEquipment.length}</Badge>
                        </div>
                        {branchEquipment.length === 0 ? (
                          <p className="text-xs text-muted-foreground pl-1">Sin equipos asignados a esta sucursal</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {branchEquipment.map(eq => (
                              <div key={eq.id} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs bg-background">
                                <Monitor className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{eq.name}</span>
                                {eq.ip && <span className="font-mono text-muted-foreground">{eq.ip}</span>}
                                {eq.os && <Badge variant="outline" className="text-xs">{eq.os}</Badge>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            )}
          </Card>
        ))
      )}

      {/* Dialog sucursal */}
      <Dialog open={creatingBranch || !!editBranch} onOpenChange={open => { if (!open) { setCreatingBranch(false); setEditBranch(null); bForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBranch ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={bForm.handleSubmit(d => editBranch ? updateBranchMutation.mutate(d) : createBranchMutation.mutate(d))} className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input {...bForm.register('name')} placeholder="Casa central, Sucursal Norte..." />
              {bForm.formState.errors.name && <p className="text-xs text-destructive">{bForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Dirección</Label>
              <Input {...bForm.register('address')} placeholder="Av. 18 de Julio 1234" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>IP pública</Label>
                <Input {...bForm.register('publicIp')} placeholder="200.1.2.3" disabled={!!bForm.watch('dynamicIp')} />
              </div>
              <div className="space-y-1">
                <Label>ISP</Label>
                <Input {...bForm.register('isp')} placeholder="Antel, Claro..." />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="dynamicIp" {...bForm.register('dynamicIp')} className="h-4 w-4" />
              <label htmlFor="dynamicIp" className="text-sm">
                <Wifi className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                IP dinámica (sin IP fija)
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreatingBranch(false); setEditBranch(null); bForm.reset(); }}>Cancelar</Button>
              <Button type="submit" disabled={createBranchMutation.isPending || updateBranchMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog segmento de red */}
      <Dialog open={!!segmentTarget} onOpenChange={open => { if (!open) { setSegmentTarget(null); sForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{segmentTarget?.segment ? 'Editar segmento' : 'Nuevo segmento de red'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={sForm.handleSubmit(d => segmentTarget?.segment ? updateSegmentMutation.mutate(d) : createSegmentMutation.mutate(d))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>VLAN</Label>
                <Input {...sForm.register('vlan')} type="number" placeholder="10, 20, 100..." min={1} max={4094} />
              </div>
              <div className="space-y-1">
                <Label>Rango de red *</Label>
                <Input {...sForm.register('networkRange')} placeholder="192.168.10.0/24" />
                {sForm.formState.errors.networkRange && <p className="text-xs text-destructive">{sForm.formState.errors.networkRange.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input {...sForm.register('description')} placeholder="Servidores, usuarios, cámaras..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setSegmentTarget(null); sForm.reset(); }}>Cancelar</Button>
              <Button type="submit" disabled={createSegmentMutation.isPending || updateSegmentMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteBranch}
        onClose={() => setDeleteBranch(null)}
        onConfirm={() => deleteBranchMutation.mutate()}
        title="Desactivar sucursal"
        description={`¿Desactivar "${deleteBranch?.name}"? Los NVRs, cámaras y equipos asociados no se eliminarán.`}
        confirmLabel="Desactivar"
        loading={deleteBranchMutation.isPending}
      />
    </div>
  );
}
