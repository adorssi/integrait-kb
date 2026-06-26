import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { ClientService } from '../../src/services/client-service';
import { AppError } from '../../src/middlewares/error-handler';
import jwt from 'jsonwebtoken';

vi.mock('../../src/services/client-service');

const SECRET = 'test-secret-de-64-caracteres-suficiente-para-las-pruebas-unitarias';

function makeToken(role: 'ADMIN' | 'TECHNICIAN' = 'ADMIN'): string {
  return jwt.sign({ sub: 'uuid-1', email: 'admin@empresa.com', role }, SECRET, { expiresIn: '8h' });
}

const mockClient = {
  id: 'uuid-c1',
  name: 'Empresa Test',
  city: 'Montevideo',
  rut: '21000000001',
  phone: '099000001',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = SECRET;
});

describe('GET /clients', () => {
  it('200 con token válido', async () => {
    vi.mocked(ClientService.list).mockResolvedValue([mockClient] as never);
    const res = await request(app).get('/clients').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('401 sin token', async () => {
    const res = await request(app).get('/clients');
    expect(res.status).toBe(401);
  });
});

describe('POST /clients', () => {
  it('201 cuando ADMIN crea cliente válido', async () => {
    vi.mocked(ClientService.create).mockResolvedValue(mockClient as never);
    const res = await request(app)
      .post('/clients')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ name: 'Empresa Test', city: 'Montevideo', rut: '21000000001', phone: '099000001' });
    expect(res.status).toBe(201);
  });

  it('400 si faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/clients')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ name: 'Solo nombre' });
    expect(res.status).toBe(400);
  });

  it('403 cuando TECHNICIAN intenta crear cliente', async () => {
    const res = await request(app)
      .post('/clients')
      .set('Authorization', `Bearer ${makeToken('TECHNICIAN')}`)
      .send({ name: 'Empresa Test', city: 'Montevideo', rut: '21000000001', phone: '099000001' });
    expect(res.status).toBe(403);
  });

  it('409 si el RUT ya existe', async () => {
    vi.mocked(ClientService.create).mockRejectedValue(new AppError(409, 'Ya existe un cliente con ese RUT'));
    const res = await request(app)
      .post('/clients')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ name: 'Empresa Test', city: 'Montevideo', rut: '21000000001', phone: '099000001' });
    expect(res.status).toBe(409);
  });
});

describe('GET /clients/:id', () => {
  it('200 con cliente existente', async () => {
    vi.mocked(ClientService.getById).mockResolvedValue(mockClient as never);
    const res = await request(app)
      .get('/clients/uuid-c1')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('uuid-c1');
  });

  it('404 si el cliente no existe', async () => {
    vi.mocked(ClientService.getById).mockRejectedValue(new AppError(404, 'Cliente no encontrado'));
    const res = await request(app)
      .get('/clients/no-existe')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /clients/:id/deactivate', () => {
  it('200 cuando ADMIN desactiva cliente', async () => {
    vi.mocked(ClientService.deactivate).mockResolvedValue({ ...mockClient, active: false } as never);
    const res = await request(app)
      .patch('/clients/uuid-c1/deactivate')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.active).toBe(false);
  });
});

describe('GET /clients/:clientId/backups (placeholder)', () => {
  it('200 con lista vacía y meta placeholder', async () => {
    const res = await request(app)
      .get('/clients/uuid-c1/backups')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.placeholder).toBe(true);
  });
});
