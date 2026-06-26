import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { AppError, errorHandler } from '../../src/middlewares/error-handler';

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('AppError', () => {
  it('crea error con statusCode y message', () => {
    const err = new AppError(404, 'No encontrado');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('No encontrado');
    expect(err.name).toBe('AppError');
  });
});

describe('errorHandler', () => {
  const req = {} as Request;
  const next = vi.fn() as NextFunction;

  it('maneja AppError con su statusCode', () => {
    const res = mockRes();
    const err = new AppError(403, 'Permisos insuficientes');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Permisos insuficientes' });
  });

  it('maneja ZodError con 400 y detalles de validación', () => {
    const res = mockRes();
    const zodErr = new ZodError([
      { code: 'too_small', path: ['name'], message: 'Requerido', minimum: 1, type: 'string', inclusive: true } as ZodIssue,
    ]);
    errorHandler(zodErr, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.error).toBe('Datos inválidos');
    expect(body.details).toHaveLength(1);
  });

  it('maneja errores genéricos con 500', () => {
    const res = mockRes();
    const err = new Error('Error inesperado');
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
