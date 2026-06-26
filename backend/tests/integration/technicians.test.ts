import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { TechnicianService } from '../../src/services/technician-service';
import { AppError } from '../../src/middlewares/error-handler';
import jwt from 'jsonwebtoken';

vi.mock('../../src/services/technician-service');

const SECRET = 'test-secret-de-64-caracteres-suficiente-para-las-pruebas-unitarias';

function makeToken(role: 'ADMIN' | 'TECHNICIAN' = 'ADMIN', id = 'admin-uuid'): string {
  return jwt.sign({ sub: id, email: 'admin@empresa.com', role }, SECRET, { expiresIn: '8h' });
}

const mockTechnicianPublic = {
  id: 'uuid-t1',
  name: 'Juan Técnico',
  email: 'juan@empresa.com',
  role: 'TECHNICIAN',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = SECRET;
});

describe('GET /technicians', () => {
  it('200 con token ADMIN', async () => {
    vi.mocked(TechnicianService.list).mockResolvedValue([mockTechnicianPublic] as never);
    const res = await request(app).get('/technicians').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).not.toHaveProperty('passwordHash');
  });

  it('401 sin token', async () => {
    const res = await request(app).get('/technicians');
    expect(res.status).toBe(401);
  });

  it('403 con token TECHNICIAN', async () => {
    const res = await request(app)
      .get('/technicians')
      .set('Authorization', `Bearer ${makeToken('TECHNICIAN')}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /technicians', () => {
  it('201 con datos válidos', async () => {
    vi.mocked(TechnicianService.create).mockResolvedValue(mockTechnicianPublic as never);
    const res = await request(app)
      .post('/technicians')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Juan Técnico', email: 'juan@empresa.com', password: 'Segura123!' });
    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('400 con password menor a 8 caracteres', async () => {
    const res = await request(app)
      .post('/technicians')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Juan', email: 'juan@empresa.com', password: 'corta' });
    expect(res.status).toBe(400);
  });

  it('400 con email inválido', async () => {
    const res = await request(app)
      .post('/technicians')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Juan', email: 'no-es-email', password: 'Segura123!' });
    expect(res.status).toBe(400);
  });

  it('409 si el email ya existe', async () => {
    vi.mocked(TechnicianService.create).mockRejectedValue(
      new AppError(409, 'Ya existe un técnico con ese email'),
    );
    const res = await request(app)
      .post('/technicians')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Juan', email: 'juan@empresa.com', password: 'Segura123!' });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /technicians/:id/deactivate', () => {
  it('200 al desactivar otro técnico', async () => {
    vi.mocked(TechnicianService.deactivate).mockResolvedValue({ ...mockTechnicianPublic, active: false } as never);
    const res = await request(app)
      .patch('/technicians/uuid-t1/deactivate')
      .set('Authorization', `Bearer ${makeToken('ADMIN', 'admin-uuid')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.active).toBe(false);
  });

  it('400 al intentar desactivarse a sí mismo', async () => {
    vi.mocked(TechnicianService.deactivate).mockRejectedValue(
      new AppError(400, 'No podés desactivar tu propia cuenta'),
    );
    const res = await request(app)
      .patch('/technicians/admin-uuid/deactivate')
      .set('Authorization', `Bearer ${makeToken('ADMIN', 'admin-uuid')}`);
    expect(res.status).toBe(400);
  });

  it('404 si el técnico no existe', async () => {
    vi.mocked(TechnicianService.deactivate).mockRejectedValue(
      new AppError(404, 'Técnico no encontrado'),
    );
    const res = await request(app)
      .patch('/technicians/no-existe/deactivate')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });
});
