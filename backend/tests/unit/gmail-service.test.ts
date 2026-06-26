import { describe, it, expect } from 'vitest';
import { parseVeeamSubject } from '../../src/services/gmail-service';

describe('parseVeeamSubject — formato estándar', () => {
  it('parsea asunto Success estándar', () => {
    const result = parseVeeamSubject('ESTUDIO BERTANI - [Success] VMs a Disco Externo (2 objects)');
    expect(result).toMatchObject({
      clientName: 'ESTUDIO BERTANI',
      result: 'SUCCESS',
      taskName: 'VMs a Disco Externo (2 objects)',
    });
  });

  it('elimina prefijo SUPPORT EXPIRED', () => {
    const result = parseVeeamSubject('SUPPORT EXPIRED ZNP - [Success] 02-ZNP_SCA_HR');
    expect(result?.clientName).toBe('ZNP');
    expect(result?.result).toBe('SUCCESS');
    expect(result?.taskName).toBe('02-ZNP_SCA_HR');
  });

  it('maneja result Warning', () => {
    expect(parseVeeamSubject('CLIENTE X - [Warning] Tarea')?.result).toBe('WARNING');
  });

  it('maneja result Failed → FAILURE', () => {
    expect(parseVeeamSubject('CLIENTE X - [Failed] Tarea')?.result).toBe('FAILURE');
  });

  it('maneja result Failure → FAILURE', () => {
    expect(parseVeeamSubject('CLIENTE X - [Failure] Tarea')?.result).toBe('FAILURE');
  });

  it('es case-insensitive en el resultado', () => {
    expect(parseVeeamSubject('CLIENTE X - [SUCCESS] Tarea')?.result).toBe('SUCCESS');
  });

  it('SUPPORT EXPIRED es case-insensitive', () => {
    expect(parseVeeamSubject('support expired EMPRESA - [Warning] Backup')?.clientName).toBe('EMPRESA');
  });

  it('preserva rawSubject original', () => {
    const subject = 'SOPORTE - [Success] Task';
    expect(parseVeeamSubject(subject)?.rawSubject).toBe(subject);
  });
});

describe('parseVeeamSubject — formato compacto (KILAFEN)', () => {
  it('parsea formato sin espacio post-guion con bracket pegado a la tarea', () => {
    // Caso real reportado: "KILAFEN -Algoritmo[Success]"
    const result = parseVeeamSubject('KILAFEN -Algoritmo[Success]');
    expect(result?.clientName).toBe('KILAFEN');
    expect(result?.result).toBe('SUCCESS');
    expect(result?.taskName).toBe('Algoritmo');
  });

  it('parsea formato con guion pegado al nombre de tarea (Warning)', () => {
    const result = parseVeeamSubject('EMPRESA XYZ -BackupDiario[Warning]');
    expect(result?.clientName).toBe('EMPRESA XYZ');
    expect(result?.result).toBe('WARNING');
    expect(result?.taskName).toBe('BackupDiario');
  });

  it('parsea formato con espacio entre tarea y bracket', () => {
    const result = parseVeeamSubject('KILAFEN -Algoritmo [Success]');
    expect(result?.clientName).toBe('KILAFEN');
    expect(result?.result).toBe('SUCCESS');
    expect(result?.taskName).toBe('Algoritmo');
  });

  it('SUPPORT EXPIRED + formato compacto', () => {
    const result = parseVeeamSubject('SUPPORT EXPIRED KILAFEN -Algoritmo[Success]');
    expect(result?.clientName).toBe('KILAFEN');
    expect(result?.result).toBe('SUCCESS');
  });
});

describe('parseVeeamSubject — casos que deben devolver null', () => {
  it('devuelve null si no tiene guion', () => {
    expect(parseVeeamSubject('asunto sin formato')).toBeNull();
  });

  it('devuelve null si no hay brackets válidos', () => {
    expect(parseVeeamSubject('CLIENTE - resultado sin brackets')).toBeNull();
  });

  it('devuelve null para string vacío', () => {
    expect(parseVeeamSubject('')).toBeNull();
  });
});
