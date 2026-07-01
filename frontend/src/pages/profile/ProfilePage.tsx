import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, CheckCircle } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const nameSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100, 'Máximo 100 caracteres'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Requerido'),
  newPassword: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .max(128, 'Máximo 128 caracteres')
    .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe tener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe tener al menos un carácter especial'),
  confirmPassword: z.string().min(1, 'Requerido'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type NameForm = z.infer<typeof nameSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { technician } = useAuth();
  const qc = useQueryClient();
  const [nameSaved, setNameSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  const nameForm = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: technician?.name ?? '' },
  });

  const pwForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const nameMutation = useMutation({
    mutationFn: (d: NameForm) => authService.updateMe({ name: d.name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    },
  });

  const pwMutation = useMutation({
    mutationFn: (d: PasswordForm) =>
      authService.updateMe({ currentPassword: d.currentPassword, newPassword: d.newPassword }),
    onSuccess: () => {
      pwForm.reset();
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    },
  });

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-muted-foreground">Editá tu nombre y contraseña</p>
      </div>

      {/* Nombre */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Datos personales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={nameForm.handleSubmit((d) => nameMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...nameForm.register('name')} />
              {nameForm.formState.errors.name && (
                <p className="text-xs text-destructive">{nameForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={technician?.email ?? ''} disabled className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">El email solo puede cambiarlo un administrador.</p>
            </div>
            {nameMutation.error && (
              <p className="text-xs text-destructive">
                {(nameMutation.error as Error).message ?? 'Error al guardar'}
              </p>
            )}
            <Button type="submit" disabled={nameMutation.isPending} className="gap-2">
              {nameSaved ? <><CheckCircle className="h-4 w-4" />Guardado</> : 'Guardar nombre'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Contraseña */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={pwForm.handleSubmit((d) => pwMutation.mutate(d))} className="space-y-4" autoComplete="off">
            <input type="password" style={{ display: 'none' }} autoComplete="current-password" readOnly />
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <Input id="currentPassword" type="password" autoComplete="current-password" {...pwForm.register('currentPassword')} />
              {pwForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">{pwForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input id="newPassword" type="password" autoComplete="new-password" {...pwForm.register('newPassword')} />
              {pwForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">{pwForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...pwForm.register('confirmPassword')} />
              {pwForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">{pwForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            {pwMutation.error && (
              <p className="text-xs text-destructive">
                {(pwMutation.error as Error & { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al cambiar la contraseña'}
              </p>
            )}
            <Button type="submit" disabled={pwMutation.isPending} className="gap-2">
              {pwSaved ? <><CheckCircle className="h-4 w-4" />Contraseña actualizada</> : 'Cambiar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
