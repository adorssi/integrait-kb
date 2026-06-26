import { describe, it, expect } from 'vitest';
import { parseVeeamSubject } from '../../src/services/gmail-service';

// Replica de la función interna de backup-service para tests unitarios
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywords(normalized: string): string[] {
  const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'the', 'and', 'y', 'e', 'sa', 'srl', 'sas', 'spa']);
  return normalized.split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function findClientId(
  clients: { id: string; name: string }[],
  clientName: string,
): string | null {
  const norm = normalizeName(clientName);
  const exact = clients.find((c) => normalizeName(c.name) === norm);
  if (exact) return exact.id;
  const contains = clients.find(
    (c) =>
      normalizeName(c.name).includes(norm) ||
      norm.includes(normalizeName(c.name)),
  );
  if (contains) return contains.id;
  const emailKw = keywords(norm);
  if (emailKw.length === 0) return null;
  const kwMatch = clients.find((c) => {
    const clientKw = keywords(normalizeName(c.name));
    return emailKw.some((w) => clientKw.includes(w));
  });
  return kwMatch?.id ?? null;
}

const clients = [
  { id: '1', name: 'KILAFEN' },
  { id: '2', name: 'GIUSIANO' },
  { id: '3', name: 'ESTUDIO BERTANI' },
  { id: '4', name: 'ZNP' },
  { id: '5', name: 'Empresa Con Espacios' },
];

describe('matchClient — exacto y contains', () => {
  it('match exacto case-insensitive', () => {
    expect(findClientId(clients, 'kilafen')).toBe('1');
    expect(findClientId(clients, 'KILAFEN')).toBe('1');
    expect(findClientId(clients, 'Kilafen')).toBe('1');
  });

  it('match cuando el email tiene sufijo (S.A., S.R.L., etc.)', () => {
    // DB "KILAFEN" ⊂ email "KILAFEN SRL" → contains
    expect(findClientId(clients, 'KILAFEN SRL')).toBe('1');
    expect(findClientId(clients, 'KILAFEN S.R.L.')).toBe('1');
    expect(findClientId(clients, 'KILAFEN S.A.')).toBe('1');
  });

  it('match cuando DB tiene nombre más largo que el email', () => {
    // email "BERTANI" ⊂ DB "ESTUDIO BERTANI" → contains
    expect(findClientId(clients, 'BERTANI')).toBe('3');
  });

  it('exacto tiene prioridad sobre contains', () => {
    const clientes = [
      { id: 'a', name: 'ZNP CORP' },
      { id: 'b', name: 'ZNP' },
    ];
    expect(findClientId(clientes, 'ZNP')).toBe('b');
  });

  it('match case-insensitive con nombre mixto en DB', () => {
    expect(findClientId(clients, 'empresa con espacios')).toBe('5');
  });

  it('devuelve null si no hay match', () => {
    expect(findClientId(clients, 'CLIENTE DESCONOCIDO XYZ')).toBeNull();
  });
});

describe('matchClient — matching por palabra clave', () => {
  it('match por palabra clave cuando contains no alcanza', () => {
    // "GIUSIANO HERMANOS" no contiene "giusiano" en DB (DB tiene "GIUSIANO")
    // pero "giusiano" sí está en DB... wait: 'giusiano'.includes('giusiano hermanos') = false
    // y 'giusiano hermanos'.includes('giusiano') = true → ya lo captura contains
    // Caso real de keyword: abreviatura en email distinta al nombre completo
    const clientes = [{ id: 'x', name: 'Clinica Santa Maria' }];
    // "Santa Maria" comparte palabras "santa" y "maria" (ambas > 2 chars)
    expect(findClientId(clientes, 'Santa Maria Clinica')).toBe('x');
  });

  it('normalizeName elimina acentos', () => {
    expect(normalizeName('Clínica Médica')).toBe('clinica medica');
    expect(normalizeName('GÜEMES')).toBe('guemes');
  });

  it('normalizeName elimina puntuación', () => {
    expect(normalizeName('S.R.L.')).toBe('s r l');
    expect(normalizeName('Empresa, S.A.')).toBe('empresa s a');
  });
});

describe('re-match — parseVeeamSubject sobre rawSubject guardado', () => {
  it('puede re-parsear rawSubject para obtener clientName', () => {
    const rawSubject = 'GIUSIANO - [Success] Backup Servidor';
    const parsed = parseVeeamSubject(rawSubject);
    expect(parsed?.clientName).toBe('GIUSIANO');
    expect(parsed?.result).toBe('SUCCESS');
  });

  it('puede re-parsear con prefijo SUPPORT EXPIRED', () => {
    const rawSubject = 'SUPPORT EXPIRED ZNP - [Warning] Tarea de archivos';
    const parsed = parseVeeamSubject(rawSubject);
    expect(parsed?.clientName).toBe('ZNP');
    expect(parsed?.result).toBe('WARNING');
  });

  it('devuelve null para asunto que no tiene formato Veeam', () => {
    expect(parseVeeamSubject('Notificación sin formato especial')).toBeNull();
  });
});
