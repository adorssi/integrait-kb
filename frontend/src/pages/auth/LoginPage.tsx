import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Monitor, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, setAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const tempTokenRef = useRef<string>('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const handleLoginError = (err: unknown) => {
    const status = (err as { response?: { status?: number; data?: { retryAfterSeconds?: number } } })?.response?.status;
    const retryAfterSeconds = (err as { response?: { data?: { retryAfterSeconds?: number } } })?.response?.data?.retryAfterSeconds;
    if (status === 423) {
      if (retryAfterSeconds) {
        const min = Math.ceil(retryAfterSeconds / 60);
        setError(`Cuenta bloqueada temporalmente. Intentá nuevamente en ${min} minuto${min !== 1 ? 's' : ''}.`);
      } else {
        setError('Cuenta bloqueada. Contactá al administrador del sistema.');
      }
    } else {
      setError('Credenciales inválidas. Verificá tu email y contraseña.');
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const result = await login(data.email, data.password);
      if (result.requiresTwoFactor) {
        tempTokenRef.current = result.tempToken!;
        setStep('totp');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      handleLoginError(err);
    }
  };

  const onSubmitTotp = async () => {
    if (totpCode.length !== 6) return;
    setError(null);
    setTotpLoading(true);
    try {
      const result = await authService.verifyTotpLogin(tempTokenRef.current, totpCode);
      setAuth(result.token, result.technician);
      navigate('/dashboard');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError('Código incorrecto. Verificá la hora de tu dispositivo e intentá nuevamente.');
      } else {
        setError('El tiempo de verificación expiró. Iniciá sesión nuevamente.');
        setStep('credentials');
        setTotpCode('');
      }
    } finally {
      setTotpLoading(false);
    }
  };

  const goBack = () => {
    setStep('credentials');
    setError(null);
    setTotpCode('');
    tempTokenRef.current = '';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        {step === 'credentials' ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Monitor className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">IT Knowledge Base</CardTitle>
              <CardDescription>Ingresá tus credenciales para continuar</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@empresa.com"
                    autoComplete="email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Ingresando...</>
                  ) : (
                    'Ingresar'
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Verificación en 2 pasos</CardTitle>
              <CardDescription>
                Ingresá el código de 6 dígitos de tu aplicación autenticadora
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totp-code">Código de verificación</Label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSubmitTotp(); }}
                  className="text-center text-xl tracking-widest font-mono"
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={totpLoading || totpCode.length !== 6}
                onClick={onSubmitTotp}
              >
                {totpLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</>
                ) : (
                  'Verificar'
                )}
              </Button>

              <Button type="button" variant="ghost" className="w-full" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
