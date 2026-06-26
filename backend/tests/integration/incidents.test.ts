import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { IncidentService } from '../../src/services/incident-service';
import { AppError } from '../../src/middlewares/error-handler';
import { IncidentStatus, Priority } from '../../src/models/types';
import jwt from 'jsonwebtoken';

vi.mock('../../src/services/incident-service');

const SECRET = 'test-secret-de-64-caracteres-suficiente-para-las-pruebas-unitarias';

function makeToken(role: 'ADMIN' | 'TECHNICIAN' = 'TECHNICIAN'): string {
  return jwt.sign({ sub: 'uuid-1', email: 'tech@empresa.com', role }, SECRET, { expiresIn: '8h' });
}

const mockIncident = {
  id: 'inc-1',
  title: 'Servidor caído',
  description: 'No responde ping',
  status: IncidentStatus.OPEN,
  priority: Priority.HIGH,
  clientId: 'client-1',
  client: { id: 'client-1', name: 'Empresa Test' },
  technicianId: null,
  assignedTo: null,
  equipmentId: null,
  equipment: null,
  solution: null,
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = SECRET;
});

describe('GET /incidents', () => {
  it('200 con token válido', async () => {
    vi.mocked(IncidentService.list).mockResolvedValue([mockIncident] as never);
    const res = await request(app).get('/incidents').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('401 sin token', async () => {
    const res = await request(app).get('/incidents');
    expect(res.status).toBe(401);
  });

  it('400 con filtro status inválido', async () => {
    const res = await request(app)
      .get('/incidents?status=INVALID')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(400);
  });
});

describe('POST /incidents', () => {
  it('201 con datos válidos', async () => {
    vi.mocked(IncidentService.create).mockResolvedValue(mockIncident as never);
    const res = await request(app)
      .post('/incidents')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ title: 'Servidor caído', description: 'No responde ping', clientId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    expect(res.status).toBe(201);
  });

  it('400 si clientId no es UUID', async () => {
    const res = await request(app)
      .post('/incidents')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ title: 'Test', description: 'Test', clientId: 'no-es-uuid' });
    expect(res.status).toBe(400);
  });

  it('400 si falta título', async () => {
    const res = await request(app)
      .post('/incidents')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ description: 'Test', clientId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /incidents/:id/status', () => {
  it('200 con transición válida', async () => {
    vi.mocked(IncidentService.changeStatus).mockResolvedValue(
      { ...mockIncident, status: IncidentStatus.IN_PROGRESS } as never,
    );
    const res = await request(app)
      .patch('/incidents/inc-1/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: IncidentStatus.IN_PROGRESS });
    expect(res.status).toBe(200);
  });

  it('400 con status inválido en body', async () => {
    const res = await request(app)
      .patch('/incidents/inc-1/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'ESTADO_INVALIDO' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /incidents/:id/assign', () => {
  it('200 cuando ADMIN asigna técnico', async () => {
    vi.mocked(IncidentService.assignTechnician).mockResolvedValue(mockIncident as never);
    const res = await request(app)
      .patch('/incidents/inc-1/assign')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ technicianId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    expect(res.status).toBe(200);
  });

  it('403 cuando TECHNICIAN intenta asignar', async () => {
    const res = await request(app)
      .patch('/incidents/inc-1/assign')
      .set('Authorization', `Bearer ${makeToken('TECHNICIAN')}`)
      .send({ technicianId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    expect(res.status).toBe(403);
  });
});

describe('POST /incidents/:id/solution', () => {
  it('201 con solución válida', async () => {
    vi.mocked(IncidentService.registerSolution).mockResolvedValue(
      { ...mockIncident, status: IncidentStatus.RESOLVED } as never,
    );
    const res = await request(app)
      .post('/incidents/inc-1/solution')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ description: 'Se reinició el servicio y se verificó conectividad', timeSpentMinutes: 45 });
    expect(res.status).toBe(201);
  });

  it('400 si descripción tiene menos de 20 caracteres', async () => {
    const res = await request(app)
      .post('/incidents/inc-1/solution')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ description: 'Muy corta', timeSpentMinutes: 10 });
    expect(res.status).toBe(400);
  });

  it('400 si timeSpentMinutes es negativo', async () => {
    const res = await request(app)
      .post('/incidents/inc-1/solution')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ description: 'Descripcion suficientemente larga para pasar validacion', timeSpentMinutes: -5 });
    expect(res.status).toBe(400);
  });

  it('404 si el incidente no existe', async () => {
    vi.mocked(IncidentService.registerSolution).mockRejectedValue(
      new AppError(404, 'Incidente no encontrado'),
    );
    const res = await request(app)
      .post('/incidents/no-existe/solution')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ description: 'Descripcion suficientemente larga para pasar validacion', timeSpentMinutes: 30 });
    expect(res.status).toBe(404);
  });
});
