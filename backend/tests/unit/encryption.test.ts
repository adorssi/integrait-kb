import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from '../../src/utils/encryption';

// Clave de 32 bytes para tests (nunca usar en producción)
const TEST_KEY = Buffer.alloc(32, 'a').toString('base64');

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

describe('encrypt / decrypt', () => {
  it('cifra y descifra texto correctamente', () => {
    const original = 'contraseña-secreta-123';
    const encrypted = encrypt(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  it('produce salidas distintas para el mismo input (IV aleatorio)', () => {
    const text = 'admin';
    expect(encrypt(text)).not.toBe(encrypt(text));
  });

  it('el texto cifrado no contiene el texto original', () => {
    const text = 'admin1234';
    expect(encrypt(text)).not.toContain(text);
  });

  it('soporta caracteres especiales y unicode', () => {
    const text = 'Contraseña@#$%ñü!123';
    expect(decrypt(encrypt(text))).toBe(text);
  });

  it('soporta strings largos', () => {
    const text = 'a'.repeat(500);
    expect(decrypt(encrypt(text))).toBe(text);
  });

  it('lanza error si ENCRYPTION_KEY no está configurada', () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY');
    process.env.ENCRYPTION_KEY = original;
  });
});
