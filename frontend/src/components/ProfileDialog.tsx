import { useState } from 'react';
import { ShieldCheck, ShieldOff, Loader2, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';
import { TotpSetupData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SetupStep = 'idle' | 'loading-qr' | 'show-qr' | 'verifying' | 'success' | 'disabling';

export function ProfileDialog({ open, onOpenChange }: Props) {
  const { technician, setAuth, token } = useAuth();
  const queryClient = useQueryClient();
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!technician) return null;

  const reset = () => {
    setSetupStep('idle');
    setSetupData(null);
    setEnableCode('');
    setDisableCode('');
    setError(null);
    setSuccessMsg(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const startSetup = async () => {
    setError(null);
    setSuccessMsg(null);
    setSetupStep('loading-qr');
    try {
      const data = await authService.setup2fa();
      setSetupData(data);
      setSetupStep('show-qr');
    } catch {
      setError('No se pudo generar el código QR. Intentá nuevamente.');
      setSetupStep('idle');
    }
  };

  const handleEnable = async () => {
    if (!setupData || enableCode.length !== 6) return;
    setError(null);
    setSetupStep('verifying');
    try {
      await authService.enable2fa(setupData.secret, enableCode);
      // Refrescar datos del técnico en el store y en el cache de queries
      const fresh = await authService.me();
      setAuth(token!, fresh);
      await queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setSuccessMsg('2FA activado correctamente. A partir de ahora necesitarás tu app autenticadora para ingresar.');
      setSetupStep('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Código incorrecto. Verificá que escaneaste el QR correctamente.');
      setSetupStep('show-qr');
    }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6) return;
    setError(null);
    setSetupStep('disabling');
    try {
      await authService.disable2fa(disableCode);
      const fresh = await authService.me();
      setAuth(token!, fresh);
      await queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setSuccessMsg('2FA desactivado.');
      setDisableCode('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Código incorrecto.');
    } finally {
      setSetupStep('idle');
    }
  };

  const isLoading = setupStep === 'loading-qr' || setupStep === 'verifying' || setupStep === 'disabling';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mi cuenta</DialogTitle>
          <p className="text-sm text-muted-foreground">{technician.email}</p>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Info básica */}
          <div className="space-y-1">
            <p className="text-sm font-medium">{technician.name}</p>
            <Badge variant={technician.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
              {technician.role === 'ADMIN' ? 'Administrador' : 'Técnico'}
            </Badge>
          </div>

          <hr className="border-border" />

          {/* Sección 2FA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {technician.twoFactorEnabled
                  ? <ShieldCheck className="h-4 w-4 text-green-500" />
                  : <ShieldOff className="h-4 w-4 text-muted-foreground" />
                }
                <span className="text-sm font-medium">Autenticación en 2 pasos</span>
              </div>
              <Badge variant={technician.twoFactorEnabled ? 'default' : 'outline'} className="text-xs">
                {technician.twoFactorEnabled ? 'Activado' : 'Desactivado'}
              </Badge>
            </div>

            {successMsg && (
              <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                {successMsg}
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* 2FA desactivado → flujo de activación */}
            {!technician.twoFactorEnabled && setupStep === 'idle' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Añade una capa extra de seguridad a tu cuenta. Necesitarás una app como Google Authenticator, Authy o Microsoft Authenticator.
                </p>
                <Button size="sm" onClick={startSetup} disabled={isLoading} className="w-full">
                  <QrCode className="h-4 w-4" />
                  Activar 2FA
                </Button>
              </div>
            )}

            {setupStep === 'loading-qr' && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {(setupStep === 'show-qr' || setupStep === 'verifying') && setupData && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Escaneá el código QR con tu app autenticadora y luego ingresá el código de 6 dígitos que aparece.
                </p>
                <div className="flex justify-center">
                  <img
                    src={setupData.qrDataUrl}
                    alt="QR para autenticador"
                    className="rounded-lg border"
                    width={200}
                    height={200}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground text-center">
                    O ingresá el código manual:
                  </p>
                  <p className="text-xs font-mono text-center bg-muted rounded px-2 py-1 break-all select-all">
                    {setupData.secret}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enable-code" className="text-xs">Código de verificación</Label>
                  <Input
                    id="enable-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={enableCode}
                    onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEnable(); }}
                    className="text-center text-lg tracking-widest font-mono"
                    autoFocus
                    disabled={setupStep === 'verifying'}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={reset} disabled={setupStep === 'verifying'} className="flex-1">
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleEnable}
                      disabled={enableCode.length !== 6 || setupStep === 'verifying'}
                      className="flex-1"
                    >
                      {setupStep === 'verifying' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {setupStep === 'success' && (
              <Button size="sm" variant="outline" onClick={reset} className="w-full">
                Cerrar
              </Button>
            )}

            {/* 2FA activado → flujo de desactivación */}
            {technician.twoFactorEnabled && setupStep === 'idle' && (
              <div className="space-y-2">
                <Label htmlFor="disable-code" className="text-xs">Código actual para desactivar</Label>
                <Input
                  id="disable-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDisable(); }}
                  className="text-center text-lg tracking-widest font-mono"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={disableCode.length !== 6 || isLoading}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Desactivar 2FA'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
