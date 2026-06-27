import { z } from 'zod';

const noHtml = (v: string) => !/[<>]/.test(v);
const HTML_MSG = 'El campo contiene caracteres no permitidos (< >)';

export const safeName = z
  .string()
  .min(1, 'Requerido')
  .max(100, 'Máximo 100 caracteres')
  .trim()
  .refine(noHtml, HTML_MSG);

export const safeShortText = z
  .string()
  .max(255, 'Máximo 255 caracteres')
  .trim()
  .refine(noHtml, HTML_MSG);

export const safeText = z
  .string()
  .max(5000, 'Máximo 5000 caracteres')
  .trim()
  .refine(noHtml, HTML_MSG);

export const safeLongText = z
  .string()
  .max(10000, 'Máximo 10000 caracteres')
  .trim()
  .refine(noHtml, HTML_MSG);

export const safeEmail = z
  .string()
  .email('Email inválido')
  .max(255, 'Máximo 255 caracteres');

export const ipAddress = z
  .string()
  .max(45, 'Dirección IP demasiado larga')
  .regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Formato de IP inválido (ej: 192.168.1.1)')
  .refine(
    (ip) => ip.split('.').every((n) => parseInt(n) <= 255),
    'Dirección IP fuera de rango (0–255 por octeto)',
  );

export const cidrRange = z
  .string()
  .max(19, 'Rango CIDR demasiado largo')
  .regex(
    /^(\d{1,3}\.){3}\d{1,3}\/(\d|[12]\d|3[02])$/,
    'Formato CIDR inválido (ej: 192.168.0.0/24)',
  );

/** Contraseñas de usuarios del sistema — aplica complejidad mínima */
export const strongPassword = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128, 'Máximo 128 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial (!@#$%...)');

/** Contraseñas de dispositivos (cámaras, NVRs) — sin restricción de complejidad */
export const deviceCredential = z.string().max(200, 'Máximo 200 caracteres');
