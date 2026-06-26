import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { AuthService } from '../../src/services/auth-service';
import { AppError } from '../../src/middlewares/error-handler';
import jwt from 'jsonwebtoken';

vi.mock('../../src/services/auth-service');

const mockTechnicianPublic = {
  id: 'uuid-1',
  name: 'Admin',
  email: 'admin@empresa.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-de-64-caracteres-suficiente-para-las-pruebas-unitarias';
});

describe('POST /auth/login', () => {
  it('200 con credenciales válidas', async () => {
    vi.mocked(AuthService.login).mockResolvedValue({
      token: 'jwt.token.aqui',
      technician: mockTechnicianPublic as never,
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@empresa.com', password: 'Admin1234!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.technician.email).toBe('admin@empresa.com');
    expect(res.body.technician).not.toHaveProperty('passwordHash');
  });

  it('400 si el email tiene formato inválido', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'no-es-email', password: 'Admin1234!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
  });

  it('400 si falta el password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@empresa.com' });

    expect(res.status).toBe(400);
  });

  it('400 si el body está vacío', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('401 si las credenciales son incorrectas', async () => {
    vi.mocked(AuthService.login).mockRejectedValue(new AppError(401, 'Credenciales inválidas'));

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@empresa.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
  });
});

describe('GET /auth/me', () => {
  function makeToken(role = 'ADMIN'): string {
    return jwt.sign(
      { sub: 'uuid-1', email: 'admin@empresa.com', role },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' },
    );
  }

  it('200 con token válido', async () => {
    vi.mocked(AuthService.getMe).mockResolvedValue(mockTechnicianPublic as never);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@empresa.com');
  });

  it('401 sin token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 con token malformado', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer token.invalido');

    expect(res.status).toBe(401);
  });
});
