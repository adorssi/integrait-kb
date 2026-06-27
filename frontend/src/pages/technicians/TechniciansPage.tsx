import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX, UserCheck, Shield, User, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { techniciansService } from '@/services/technicians.service';
import { Technician } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';

const techSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres'),
  email: z.string().email('Email inválido').max(255, 'Máximo 255 caracteres'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .max(128, 'Máximo 128 caracteres')
    .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe tener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe tener al menos un carácter especial')
    .optional()
    .or(z.literal('')),
  role: z.enum(['TECHNICIAN', 'ADMIN']),
});
type TechForm = z.infer<typeof techSchema>;

function isLocked(t: Technician): boolean {
  return !!t.lockedUntil && new Date(t.lockedUntil) > new Date();
}

function lockLabel(t: Technician): string {
  if (!t.lockedUntil) return '';
  const until = new Date(t.lockedUntil);
  if (until >= new Date('2099-01-01')) return 'Bloqueado';
  const diffMin = Math.ceil((until.getTime() - Date.now()) / 60000);
  return `Bloqueado (${diffMin} min restantes)`;
}

export function TechniciansPage() {
  const qc = useQueryClient();
  const { technician: me } = useAuth();
  const [editTarget, setEditTarget] = useState<Technician | null>(null);
  const [creating, setCreating] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Technician | null>(null);

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: techniciansService.list,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<TechForm>({
    resolver: zodResolver(techSchema),
    defaultValues: { role: 'TECHNICIAN' },
  });

  const createMutation = useMutation({
    mutationFn: (d: TechForm) => techniciansService.create({ ...d, password: d.password! }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['technicians'] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: (d: TechForm) => techniciansService.update(editTarget!.id, { name: d.name, email: d.email, role: d.role, ...(d.password ? { password: d.password } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['technicians'] }); closeForm(); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => techniciansService.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['technicians'] }); setDeactivateTarget(null); },
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => techniciansService.unlock(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['technicians'] }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => techniciansService.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['technicians'] }),
  });

  const openCreate = () => { reset({ role: 'TECHNICIAN', name: '', email: '', password: '' }); setCreating(true); };
  const openEdit = (t: Technician) => { setEditTarget(t); reset({ name: t.name, email: t.email, role: t.role, password: '' }); };
  const closeForm = () => { setCreating(false); setEditTarget(null); reset(); };
  const onSubmit = (d: TechForm) => editTarget ? updateMutation.mutate(d) : createMutation.mutate(d);

  const isOpen = creating || !!editTarget;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Técnicos</h1>
          <p className="text-muted-foreground">{technicians.length} técnicos registrados</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo técnico</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : technicians.length === 0 ? (
            <EmptyState icon={User} title="No hay técnicos" description="Creá el primer técnico" action={<Button onClick={openCreate} size="sm"><Plus className="h-4 w-4" />Nuevo técnico</Button>} />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  {['Nombre', 'Email', 'Rol', 'Estado', 'Creado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {technicians.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {t.role === 'ADMIN' ? <Shield className="mr-1 h-3 w-3" /> : <User className="mr-1 h-3 w-3" />}
                        {t.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant={t.active ? 'success' : 'outline'}>{t.active ? 'Activo' : 'Inactivo'}</Badge>
                        {isLocked(t) && (
                          <Badge variant="critical" className="gap-1">
                            <LockKeyhole className="h-3 w-3" />{lockLabel(t)}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        {isLocked(t) && t.id !== me?.id && (
                          <Button variant="ghost" size="icon" onClick={() => unlockMutation.mutate(t.id)} title="Desbloquear" className="text-priority-medium hover:text-priority-medium" disabled={unlockMutation.isPending}>
                            <LockKeyholeOpen className="h-4 w-4" />
                          </Button>
                        )}
                        {!t.active && (
                          <Button variant="ghost" size="icon" onClick={() => activateMutation.mutate(t.id)} title="Reactivar" className="text-priority-low hover:text-priority-low" disabled={activateMutation.isPending}>
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {t.active && t.id !== me?.id && (
                          <Button variant="ghost" size="icon" onClick={() => setDeactivateTarget(t)} title="Desactivar" className="text-destructive hover:text-destructive">
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isOpen} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar técnico' : 'Nuevo técnico'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input {...register('name')} placeholder="Juan García" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input {...register('email')} type="email" placeholder="juan@empresa.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{editTarget ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</Label>
              <Input {...register('password')} type="password" placeholder="••••••••" />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as 'ADMIN' | 'TECHNICIAN')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECHNICIAN">Técnico</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(createMutation.error || updateMutation.error) && (
              <p className="text-xs text-destructive">Ocurrió un error. Verificá los datos e intentá nuevamente.</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
        title="Desactivar técnico"
        description={`¿Seguro que querés desactivar a ${deactivateTarget?.name}? No podrá ingresar al sistema.`}
        confirmLabel="Desactivar"
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}
