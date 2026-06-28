import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verify as totpVerify } from 'otplib';
import qrcode from 'qrcode';
import { TechnicianRepository } from '../repositories/technician-repository';
import { IAuthResponse, IAuthPayload, ILoginResponse, ITotpSetupData, Role } from '../models/types';
import { AppError } from '../middlewares/error-handler';
import { toPublic, TechnicianPublic } from '../utils/technician-utils';
import { encrypt, decrypt } from '../utils/encryption';

const MAX_LOGIN_ATTEMPTS = 5;
const ADMIN_LOCK_MS = 5 * 60 * 1000;
const PERMANENT_LOCK = new Date('2099-12-31T23:59:59Z');
const TOTP_APP_NAME = 'IT Knowledge Base';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado');
  return secret;
}

export const AuthService = {
  /**
   * Autentica un técnico con email y password.
   * Si tiene 2FA habilitado, devuelve un token temporal en lugar del JWT final.
   */
  async login(email: string, password: string): Promise<ILoginResponse> {
    const technician = await TechnicianRepository.findByEmail(email);

    if (!technician) throw new AppError(401, 'Credenciales inválidas');
    if (!technician.active) throw new AppError(401, 'Cuenta desactivada');

    if (technician.lockedUntil) {
      const now = new Date();
      if (technician.lockedUntil > now) {
        const isPermanent = technician.lockedUntil >= PERMANENT_LOCK;
        if (isPermanent) throw new AppError(423, 'Cuenta bloqueada. Contactá al administrador.');
        const retryAfterSeconds = Math.ceil((technician.lockedUntil.getTime() - now.getTime()) / 1000);
        throw new AppError(423, 'Cuenta bloqueada temporalmente.', { retryAfterSeconds });
      }
      await TechnicianRepository.resetFailedAttempts(technician.id);
    }

    const passwordMatch = await bcrypt.compare(password, technician.passwordHash);
    if (!passwordMatch) {
      const newAttempts = await TechnicianRepository.incrementFailedAttempts(technician.id);
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = technician.role === 'ADMIN' ? new Date(Date.now() + ADMIN_LOCK_MS) : PERMANENT_LOCK;
        await TechnicianRepository.setLock(technician.id, lockedUntil);
      }
      throw new AppError(401, 'Credenciales inválidas');
    }

    if (technician.failedLoginAttempts > 0) {
      await TechnicianRepository.resetFailedAttempts(technician.id);
    }

    // Credenciales válidas: verificar estado de 2FA
    if (technician.twoFactorEnabled) {
      // Tiene 2FA configurado — pedir código del autenticador
      const tempPayload = { sub: technician.id, email: technician.email, role: technician.role, scope: 'totp-verify' };
      const tempToken = jwt.sign(tempPayload, getJwtSecret(), { expiresIn: '5m' } as jwt.SignOptions);
      return { requiresTwoFactor: true, tempToken };
    }

    if (technician.twoFactorRequired) {
      // El admin exige 2FA pero aún no está configurado — forzar setup antes de acceder
      const tempPayload = { sub: technician.id, email: technician.email, role: technician.role, scope: 'totp-setup' };
      const tempToken = jwt.sign(tempPayload, getJwtSecret(), { expiresIn: '10m' } as jwt.SignOptions);
      return { requiresTotpSetup: true, tempToken };
    }

    return AuthService._buildAuthResponse(technician.id, technician.email, technician.role as Role, toPublic(technician));
  },

  /** Verifica el código TOTP y el token temporal. Devuelve el JWT final. */
  async verifyTotpLogin(tempToken: string, code: string): Promise<IAuthResponse> {
    let payload: IAuthPayload;
    try {
      payload = jwt.verify(tempToken, getJwtSecret()) as IAuthPayload;
    } catch {
      throw new AppError(401, 'Token expirado o inválido. Iniciá sesión nuevamente.');
    }

    if (payload.scope !== 'totp-verify') throw new AppError(401, 'Token inválido.');

    const technician = await TechnicianRepository.findById(payload.sub);
    if (!technician || !technician.active) throw new AppError(401, 'Cuenta no disponible.');
    if (!technician.twoFactorEnabled || !technician.totpSecret) throw new AppError(400, '2FA no está habilitado.');

    const secret = decrypt(technician.totpSecret);
    const result = await totpVerify({ strategy: 'totp', secret, token: code });
    if (!result.valid) throw new AppError(401, 'Código incorrecto. Verificá la hora de tu dispositivo.');

    return AuthService._buildAuthResponse(technician.id, technician.email, technician.role as Role, toPublic(technician));
  },

  /** Genera un secreto TOTP y devuelve el QR como data URL. No guarda nada aún. */
  async setupTotp(technicianId: string): Promise<ITotpSetupData> {
    const technician = await TechnicianRepository.findById(technicianId);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');
    if (technician.twoFactorEnabled) throw new AppError(409, '2FA ya está habilitado.');

    const secret = generateSecret();
    const otpauthUrl = generateURI({ strategy: 'totp', issuer: TOTP_APP_NAME, label: technician.email, secret });
    const qrDataUrl = await qrcode.toDataURL(otpauthUrl, { width: 220, margin: 2 });

    return { secret, qrDataUrl, otpauthUrl };
  },

  /** Verifica el primer código TOTP y guarda el secreto cifrado. */
  async enableTotp(technicianId: string, secret: string, code: string): Promise<void> {
    const technician = await TechnicianRepository.findById(technicianId);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');
    if (technician.twoFactorEnabled) throw new AppError(409, '2FA ya está habilitado.');

    const result = await totpVerify({ strategy: 'totp', secret, token: code });
    if (!result.valid) throw new AppError(401, 'Código incorrecto. Verificá que escaneaste el QR correctamente.');

    await TechnicianRepository.enableTotp(technicianId, encrypt(secret));
  },

  /** Verifica el código TOTP actual y deshabilita el 2FA. */
  async disableTotp(technicianId: string, code: string): Promise<void> {
    const technician = await TechnicianRepository.findById(technicianId);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');
    if (!technician.twoFactorEnabled || !technician.totpSecret) throw new AppError(400, '2FA no está habilitado.');

    const secret = decrypt(technician.totpSecret);
    const result = await totpVerify({ strategy: 'totp', secret, token: code });
    if (!result.valid) throw new AppError(401, 'Código incorrecto.');

    await TechnicianRepository.disableTotp(technicianId);
  },

  /**
   * Devuelve los datos de setup (QR + secret) para el flujo de 2FA forzado.
   * Solo acepta tokens con scope 'totp-setup' (emitidos cuando el admin exige 2FA).
   */
  async setupTotpForced(tempToken: string): Promise<ITotpSetupData> {
    let payload: IAuthPayload;
    try {
      payload = jwt.verify(tempToken, getJwtSecret()) as IAuthPayload;
    } catch {
      throw new AppError(401, 'Token expirado. Iniciá sesión nuevamente.');
    }
    if (payload.scope !== 'totp-setup') throw new AppError(401, 'Token inválido.');

    const technician = await TechnicianRepository.findById(payload.sub);
    if (!technician || !technician.active) throw new AppError(401, 'Cuenta no disponible.');

    const secret = generateSecret();
    const otpauthUrl = generateURI({ strategy: 'totp', issuer: TOTP_APP_NAME, label: technician.email, secret });
    const qrDataUrl = await qrcode.toDataURL(otpauthUrl, { width: 220, margin: 2 });
    return { secret, qrDataUrl, otpauthUrl };
  },

  /**
   * Verifica el primer código TOTP en el flujo forzado, activa 2FA y devuelve el JWT final.
   */
  async enableTotpForced(tempToken: string, secret: string, code: string): Promise<IAuthResponse> {
    let payload: IAuthPayload;
    try {
      payload = jwt.verify(tempToken, getJwtSecret()) as IAuthPayload;
    } catch {
      throw new AppError(401, 'Token expirado. Iniciá sesión nuevamente.');
    }
    if (payload.scope !== 'totp-setup') throw new AppError(401, 'Token inválido.');

    const technician = await TechnicianRepository.findById(payload.sub);
    if (!technician || !technician.active) throw new AppError(401, 'Cuenta no disponible.');

    const result = await totpVerify({ strategy: 'totp', secret, token: code });
    if (!result.valid) throw new AppError(401, 'Código incorrecto. Verificá que escaneaste el QR correctamente.');

    await TechnicianRepository.enableTotp(technician.id, encrypt(secret));
    const updated = await TechnicianRepository.findById(technician.id);
    return AuthService._buildAuthResponse(technician.id, technician.email, technician.role as Role, toPublic(updated!));
  },

  /** Deshabilita el 2FA de cualquier técnico (solo para admins — recuperación). */
  async adminDisableTotp(technicianId: string): Promise<void> {
    const technician = await TechnicianRepository.findById(technicianId);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');
    await TechnicianRepository.disableTotp(technicianId);
  },

  async getMe(technicianId: string): Promise<TechnicianPublic> {
    const technician = await TechnicianRepository.findById(technicianId);
    if (!technician) throw new AppError(404, 'Técnico no encontrado');
    return toPublic(technician);
  },

  _buildAuthResponse(id: string, email: string, role: Role, pub: TechnicianPublic): IAuthResponse {
    const payload: IAuthPayload = { sub: id, email, role };
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' } as jwt.SignOptions);
    return { token, technician: pub };
  },
};
