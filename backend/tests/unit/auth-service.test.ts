import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/auth-service';
import { TechnicianRepository } from '../../src/repositories/technician-repository';
import { AppError } from '../../src/middlewares/error-handler';
import bcrypt from 'bcrypt';

vi.mock('../../src/repositories/technician-repository');
vi.mock('bcrypt');

const mockTechnician = {
  id: 'uuid-1',
  name: 'Admin',
  email: 'admin@empresa.com',
  passwordHash: '$2b$12$hasheado',
  role: 'ADMIN' as const,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-de-64-caracteres-suficiente-para-las-pruebas-unitarias';
  process.env.JWT_EXPIRES_IN = '8h';
});

describe('AuthService.login', () => {
  it('devuelve token y técnico sin passwordHash en happy path', async () => {
    vi.mocked(TechnicianRepository.findByEmail).mockResolvedValue(mockTechnician);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await AuthService.login('admin@empresa.com', 'Admin1234!');

    expect(result.token).toBeDefined();
    expect(result.technician).not.toHaveProperty('passwordHash');
    expect(result.technician.email).toBe('admin@empresa.com');
  });

  it('lanza 401 si el email no existe', async () => {
    vi.mocked(TechnicianRepository.findByEmail).mockResolvedValue(null);

    await expect(AuthService.login('noexiste@test.com', 'pass')).rejects.toThrow(
      new AppError(401, 'Credenciales inválidas'),
    );
  });

  it('lanza 401 si el técnico está inactivo', async () => {
    vi.mocked(TechnicianRepository.findByEmail).mockResolvedValue({ ...mockTechnician, active: false });

    await expect(AuthService.login('admin@empresa.com', 'Admin1234!')).rejects.toThrow(
      new AppError(401, 'Cuenta desactivada'),
    );
  });

  it('lanza 401 si el password es incorrecto', async () => {
    vi.mocked(TechnicianRepository.findByEmail).mockResolvedValue(mockTechnician);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(AuthService.login('admin@empresa.com', 'wrong')).rejects.toThrow(
      new AppError(401, 'Credenciales inválidas'),
    );
  });
});

describe('AuthService.getMe', () => {
  it('devuelve técnico sin passwordHash', async () => {
    vi.mocked(TechnicianRepository.findById).mockResolvedValue(mockTechnician);

    const result = await AuthService.getMe('uuid-1');

    expect(result).not.toHaveProperty('passwordHash');
    expect(result.id).toBe('uuid-1');
  });

  it('lanza 404 si el técnico no existe', async () => {
    vi.mocked(TechnicianRepository.findById).mockResolvedValue(null);

    await expect(AuthService.getMe('uuid-inexistente')).rejects.toThrow(
      new AppError(404, 'Técnico no encontrado'),
    );
  });
});
