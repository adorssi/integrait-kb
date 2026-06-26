import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TechnicianService } from '../../src/services/technician-service';
import { TechnicianRepository } from '../../src/repositories/technician-repository';
import { AppError } from '../../src/middlewares/error-handler';
import bcrypt from 'bcrypt';

vi.mock('../../src/repositories/technician-repository');
vi.mock('bcrypt');

const mockTechnician = {
  id: 'uuid-t1',
  name: 'Juan Técnico',
  email: 'juan@empresa.com',
  passwordHash: '$2b$12$hash',
  role: 'TECHNICIAN' as const,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe('TechnicianService.create', () => {
  it('crea técnico cuando el email no existe', async () => {
    vi.mocked(TechnicianRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('$2b$12$nuevohash' as never);
    vi.mocked(TechnicianRepository.create).mockResolvedValue(mockTechnician);

    const result = await TechnicianService.create({
      name: 'Juan Técnico',
      email: 'juan@empresa.com',
      password: 'Segura123!',
    });

    expect(result).not.toHaveProperty('passwordHash');
    expect(bcrypt.hash).toHaveBeenCalledWith('Segura123!', 12);
  });

  it('lanza 409 si el email ya existe', async () => {
    vi.mocked(TechnicianRepository.findByEmail).mockResolvedValue(mockTechnician);

    await expect(
      TechnicianService.create({ name: 'Otro', email: 'juan@empresa.com', password: 'pass' }),
    ).rejects.toThrow(new AppError(409, 'Ya existe un técnico con ese email'));
  });
});

describe('TechnicianService.update', () => {
  it('actualiza nombre sin tocar password', async () => {
    vi.mocked(TechnicianRepository.findById).mockResolvedValue(mockTechnician);
    vi.mocked(TechnicianRepository.update).mockResolvedValue({ ...mockTechnician, name: 'Juan Actualizado' });

    const result = await TechnicianService.update('uuid-t1', { name: 'Juan Actualizado' }, 'otro-id');

    expect(result.name).toBe('Juan Actualizado');
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('hashea el password cuando se envía uno nuevo', async () => {
    vi.mocked(TechnicianRepository.findById).mockResolvedValue(mockTechnician);
    vi.mocked(bcrypt.hash).mockResolvedValue('$2b$12$nuevohash' as never);
    vi.mocked(TechnicianRepository.update).mockResolvedValue(mockTechnician);

    await TechnicianService.update('uuid-t1', { password: 'NuevoPass123!' }, 'otro-id');

    expect(bcrypt.hash).toHaveBeenCalledWith('NuevoPass123!', 12);
  });

  it('lanza 409 si el nuevo email pertenece a otro técnico', async () => {
    vi.mocked(TechnicianRepository.findById).mockResolvedValue(mockTechnician);
    vi.mocked(TechnicianRepository.findByEmail).mockResolvedValue({ ...mockTechnician, id: 'uuid-t2' });

    await expect(
      TechnicianService.update('uuid-t1', { email: 'otro@empresa.com' }, 'admin-id'),
    ).rejects.toThrow(new AppError(409, 'Ya existe un técnico con ese email'));
  });

  it('lanza 404 si el técnico no existe', async () => {
    vi.mocked(TechnicianRepository.findById).mockResolvedValue(null);

    await expect(
      TechnicianService.update('no-existe', { name: 'Nuevo' }, 'admin-id'),
    ).rejects.toThrow(new AppError(404, 'Técnico no encontrado'));
  });
});

describe('TechnicianService.deactivate', () => {
  it('desactiva técnico correctamente', async () => {
    vi.mocked(TechnicianRepository.findById).mockResolvedValue(mockTechnician);
    vi.mocked(TechnicianRepository.deactivate).mockResolvedValue({ ...mockTechnician, active: false });

    const result = await TechnicianService.deactivate('uuid-t1', 'admin-id');
    expect(result.active).toBe(false);
  });

  it('lanza 400 si el técnico intenta desactivarse a sí mismo', async () => {
    await expect(
      TechnicianService.deactivate('uuid-t1', 'uuid-t1'),
    ).rejects.toThrow(new AppError(400, 'No podés desactivar tu propia cuenta'));
  });

  it('lanza 404 si el técnico no existe', async () => {
    vi.mocked(TechnicianRepository.findById).mockResolvedValue(null);

    await expect(
      TechnicianService.deactivate('no-existe', 'admin-id'),
    ).rejects.toThrow(new AppError(404, 'Técnico no encontrado'));
  });
});
