import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Pencil, Building2, RefreshCw, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientsService } from '@/services/clients.service';
import { backupsService } from '@/services/backups.service';
import { Client } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';

const clientSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  city: z.string().min(1, 'Ciudad requerida'),
  rut: z.string().min(1, 'RUT requerido'),
  phone: z.string().min(1, 'Teléfono requerido'),
  notes: z.string().optional(),
});
type ClientForm = z.infer<typeof clientSchema>;

export function ClientsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', debouncedSearch],
    queryFn: () => clientsService.list(debouncedSearch || undefined),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  });

  const syncMutation = useMutation({
    mutationFn: backupsService.sync,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backup-status'] });
      qc.invalidateQueries({ queryKey: ['backup-unmatched-names'] });
      // Invalida todos los backups para que los calendarios se refresquen
      qc.invalidateQueries({ queryKey: ['backups'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: clientsService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: (d: ClientForm) => clientsService.update(editTarget!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); closeForm(); },
  });

  const openCreate = () => { reset({ name: '', city: '', rut: '', phone: '', notes: '' }); setCreating(true); };
  const openEdit = (c: Client) => { setEditTarget(c); reset({ name: c.name, city: c.city, rut: c.rut, phone: c.phone, notes: c.notes ?? '' }); };
  const closeForm = () => { setCreating(false); setEditTarget(null); reset(); };
  const onSubmit = (d: ClientForm) => editTarget ? updateMutation.mutate(d) : createMutation.mutate(d);
  const isOpen = creating || !!editTarget;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{clients.length} clientes activos</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizar Backups
            </Button>
          )}
          {isAdmin && <Button onClick={openCreate}><Plus className="h-4 w-4" />Nuevo cliente</Button>}
        </div>
      </div>

      {syncMutation.data && (
        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          Sync completado — nuevos: <strong>{syncMutation.data.imported}</strong>
          {syncMutation.data.rematched > 0 && (
            <> · re-asignados: <strong className="text-green-600">{syncMutation.data.rematched}</strong></>
          )}
          {' '}· omitidos: <strong>{syncMutation.data.skipped}</strong>
          {syncMutation.data.unmatched.length > 0 && (
            <span className="ml-2 text-yellow-600 text-xs">Sin match: {syncMutation.data.unmatched.join(', ')}</span>
          )}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nombre..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : clients.length === 0 ? (
            <EmptyState icon={Building2} title="No hay clientes" description={search ? 'No se encontraron resultados' : 'Creá el primer cliente'} action={isAdmin && !search ? <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4" />Nuevo cliente</Button> : undefined} />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  {['Nombre', 'Ciudad', 'RUT', 'Teléfono', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.city}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.rut}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-3"><Badge variant={c.active ? 'success' : 'outline'}>{c.active ? 'Activo' : 'Inactivo'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/clients/${c.id}`)} title="Ver detalle"><Eye className="h-4 w-4" /></Button>
                        {isAdmin && <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar"><Pencil className="h-4 w-4" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nombre</Label>
                <Input {...register('name')} placeholder="Empresa S.A." />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input {...register('city')} placeholder="Montevideo" />
                {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>RUT</Label>
                <Input {...register('rut')} placeholder="21000000001" />
                {errors.rut && <p className="text-xs text-destructive">{errors.rut.message}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Teléfono</Label>
                <Input {...register('phone')} placeholder="099 000 000" />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notas (opcional)</Label>
                <Input {...register('notes')} placeholder="Infraestructura, particularidades..." />
              </div>
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
    </div>
  );
}
