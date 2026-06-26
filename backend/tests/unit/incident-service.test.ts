import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncidentService } from '../../src/services/incident-service';
import { IncidentRepository } from '../../src/repositories/incident-repository';
import { ClientRepository } from '../../src/repositories/client-repository';
import { TechnicianRepository } from '../../src/repositories/technician-repository';
import { EquipmentRepository } from '../../src/repositories/equipment-repository';
import { AppError } from '../../src/middlewares/error-handler';
import { IncidentStatus, Priority } from '../../src/models/types';

vi.mock('../../src/repositories/incident-repository');
vi.mock('../../src/repositories/client-repository');
vi.mock('../../src/repositories/technician-repository');
vi.mock('../../src/repositories/equipment-repository');

const mockClient = { id: 'client-1', name: 'Test', active: true } as never;
const mockTech = { id: 'tech-1', name: 'Juan', active: true } as never;
const mockEquipment = { id: 'equip-1', clientId: 'client-1', active: true } as never;

const mockIncident = {
  id: 'inc-1',
  title: 'Servidor caído',
  description: 'No responde ping',
  status: IncidentStatus.OPEN,
  priority: Priority.HIGH,
  clientId: 'client-1',
  technicianId: null,
  equipmentId: null,
  solution: null,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe('IncidentService.create', () => {
  it('crea incidente correctamente en happy path', async () => {
    vi.mocked(ClientRepository.findById).mockResolvedValue(mockClient);
    vi.mocked(IncidentRepository.create).mockResolvedValue(mockIncident as never);

    const result = await IncidentService.create({
      title: 'Servidor caído',
      description: 'No responde ping',
      clientId: 'client-1',
    });

    expect(result.title).toBe('Servidor caído');
  });

  it('lanza 404 si el cliente no existe', async () => {
    vi.mocked(ClientRepository.findById).mockResolvedValue(null);

    await expect(IncidentService.create({
      title: 'Test', description: 'Test', clientId: 'no-existe',
    })).rejects.toThrow(new AppError(404, 'Cliente no encontrado'));
  });

  it('lanza 400 si el equipo no pertenece al cliente', async () => {
    vi.mocked(ClientRepository.findById).mockResolvedValue(mockClient);
    vi.mocked(EquipmentRepository.findById).mockResolvedValue(
      { ...mockEquipment, clientId: 'otro-client' } as never,
    );

    await expect(IncidentService.create({
      title: 'Test', description: 'Test', clientId: 'client-1', equipmentId: 'equip-1',
    })).rejects.toThrow(new AppError(400, 'El equipo no pertenece al cliente indicado'));
  });
});

describe('IncidentService.update', () => {
  it('actualiza incidente en estado OPEN', async () => {
    vi.mocked(IncidentRepository.findById).mockResolvedValue(mockIncident as never);
    vi.mocked(IncidentRepository.update).mockResolvedValue({ ...mockIncident, title: 'Actualizado' } as never);

    const result = await IncidentService.update('inc-1', { title: 'Actualizado' });
    expect(result.title).toBe('Actualizado');
  });

  it('lanza 400 si el incidente no está en OPEN', async () => {
    vi.mocked(IncidentRepository.findById).mockResolvedValue(
      { ...mockIncident, status: IncidentStatus.IN_PROGRESS } as never,
    );

    await expect(IncidentService.update('inc-1', { title: 'Nuevo' }))
      .rejects.toThrow(new AppError(400, 'Solo se pueden editar incidentes en estado OPEN'));
  });
});

describe('IncidentService.changeStatus', () => {
  it('transición válida OPEN → IN_PROGRESS', async () => {
    vi.mocked(IncidentRepository.findById).mockResolvedValue(mockIncident as never);
    vi.mocked(IncidentRepository.updateStatus).mockResolvedValue(
      { ...mockIncident, status: IncidentStatus.IN_PROGRESS } as never,
    );

    const result = await IncidentService.changeStatus('inc-1', IncidentStatus.IN_PROGRESS);
    expect(result.status).toBe(IncidentStatus.IN_PROGRESS);
  });

  it('lanza 400 en transición inválida OPEN → RESOLVED', async () => {
    vi.mocked(IncidentRepository.findById).mockResolvedValue(mockIncident as never);

    await expect(IncidentService.changeStatus('inc-1', IncidentStatus.RESOLVED))
      .rejects.toThrow(AppError);
  });

  it('lanza 400 al intentar resolver sin solución', async () => {
    vi.mocked(IncidentRepository.findById).mockResolvedValue(
      { ...mockIncident, status: IncidentStatus.IN_PROGRESS, solution: null } as never,
    );

    await expect(IncidentService.changeStatus('inc-1', IncidentStatus.RESOLVED))
      .rejects.toThrow(new AppError(400, 'Debe registrar una solución antes de resolver el incidente'));
  });
});

describe('IncidentService.registerSolution', () => {
  it('registra solución y cambia estado a RESOLVED', async () => {
    vi.mocked(IncidentRepository.findById).mockResolvedValue(
      { ...mockIncident, status: IncidentStatus.IN_PROGRESS } as never,
    );
    vi.mocked(IncidentRepository.createSolution).mockResolvedValue({ id: 'sol-1' } as never);
    vi.mocked(IncidentRepository.updateStatus).mockResolvedValue(
      { ...mockIncident, status: IncidentStatus.RESOLVED } as never,
    );

    const result = await IncidentService.registerSolution('inc-1', {
      description: 'Se reinició el servicio de red correctamente',
      timeSpentMinutes: 30,
    });

    expect(result.status).toBe(IncidentStatus.RESOLVED);
  });

  it('lanza 400 si el incidente ya está resuelto', async () => {
    vi.mocked(IncidentRepository.findById).mockResolvedValue(
      { ...mockIncident, status: IncidentStatus.RESOLVED } as never,
    );

    await expect(IncidentService.registerSolution('inc-1', {
      description: 'Descripcion de la solucion del problema tecnico',
      timeSpentMinutes: 10,
    })).rejects.toThrow(new AppError(400, 'El incidente ya está resuelto'));
  });

  it('lanza 400 si ya tiene solución registrada', async () => {
    vi.mocked(IncidentRepository.findById).mockResolvedValue(
      { ...mockIncident, status: IncidentStatus.IN_PROGRESS, solution: { id: 'sol-existing' } } as never,
    );

    await expect(IncidentService.registerSolution('inc-1', {
      description: 'Descripcion de la solucion del problema tecnico',
      timeSpentMinutes: 10,
    })).rejects.toThrow(new AppError(400, 'El incidente ya tiene una solución registrada'));
  });
});

describe('IncidentService.assignTechnician', () => {
  it('asigna técnico activo correctamente', async () => {
    vi.mocked(IncidentRepository.findById).mockResolvedValue(mockIncident as never);
    vi.mocked(TechnicianRepository.findById).mockResolvedValue(mockTech);
    vi.mocked(IncidentRepository.assignTechnician).mockResolvedValue(
      { ...mockIncident, technicianId: 'tech-1' } as never,
    );

    const result = await IncidentService.assignTechnician('inc-1', 'tech-1');
    expect(result.technicianId).toBe('tech-1');
  });

  it('lanza 404 si el técnico no existe', async () => {
    vi.mocked(IncidentRepository.findById).mockResolvedValue(mockIncident as never);
    vi.mocked(TechnicianRepository.findById).mockResolvedValue(null);

    await expect(IncidentService.assignTechnician('inc-1', 'no-existe'))
      .rejects.toThrow(new AppError(404, 'Técnico no encontrado'));
  });
});
