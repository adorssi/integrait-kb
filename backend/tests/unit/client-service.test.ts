import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientService } from '../../src/services/client-service';
import { ClientRepository } from '../../src/repositories/client-repository';
import { AppError } from '../../src/middlewares/error-handler';

vi.mock('../../src/repositories/client-repository');

const mockClient = {
  id: 'uuid-c1',
  name: 'Empresa Test',
  city: 'Montevideo',
  rut: '21000000001',
  phone: '099000001',
  contact: null,
  notes: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe('ClientService.create', () => {
  it('crea cliente cuando el RUT no existe', async () => {
    vi.mocked(ClientRepository.findByRut).mockResolvedValue(null);
    vi.mocked(ClientRepository.create).mockResolvedValue(mockClient);

    const result = await ClientService.create({
      name: 'Empresa Test', city: 'Montevideo', rut: '21000000001', phone: '099000001',
    });

    expect(result.name).toBe('Empresa Test');
    expect(ClientRepository.create).toHaveBeenCalledOnce();
  });

  it('lanza 409 si el RUT ya existe', async () => {
    vi.mocked(ClientRepository.findByRut).mockResolvedValue(mockClient);

    await expect(
      ClientService.create({ name: 'Otro', city: 'Pando', rut: '21000000001', phone: '099000002' }),
    ).rejects.toThrow(new AppError(409, 'Ya existe un cliente con ese RUT'));
  });
});

describe('ClientService.getById', () => {
  it('devuelve cliente si existe', async () => {
    vi.mocked(ClientRepository.findById).mockResolvedValue(mockClient);
    const result = await ClientService.getById('uuid-c1');
    expect(result.id).toBe('uuid-c1');
  });

  it('lanza 404 si no existe', async () => {
    vi.mocked(ClientRepository.findById).mockResolvedValue(null);
    await expect(ClientService.getById('no-existe')).rejects.toThrow(
      new AppError(404, 'Cliente no encontrado'),
    );
  });
});

describe('ClientService.update', () => {
  it('actualiza correctamente', async () => {
    vi.mocked(ClientRepository.findById).mockResolvedValue(mockClient);
    vi.mocked(ClientRepository.findByRut).mockResolvedValue(null);
    vi.mocked(ClientRepository.update).mockResolvedValue({ ...mockClient, city: 'Pando' });

    const result = await ClientService.update('uuid-c1', { city: 'Pando' });
    expect(result.city).toBe('Pando');
  });

  it('lanza 409 si el nuevo RUT pertenece a otro cliente', async () => {
    const otroCliente = { ...mockClient, id: 'uuid-c2' };
    vi.mocked(ClientRepository.findById).mockResolvedValue(mockClient);
    vi.mocked(ClientRepository.findByRut).mockResolvedValue(otroCliente);

    await expect(ClientService.update('uuid-c1', { rut: '21000000002' })).rejects.toThrow(
      new AppError(409, 'Ya existe un cliente con ese RUT'),
    );
  });
});

describe('ClientService.deactivate', () => {
  it('desactiva cliente existente', async () => {
    vi.mocked(ClientRepository.findById).mockResolvedValue(mockClient);
    vi.mocked(ClientRepository.deactivate).mockResolvedValue({ ...mockClient, active: false });

    const result = await ClientService.deactivate('uuid-c1');
    expect(result.active).toBe(false);
  });
});
