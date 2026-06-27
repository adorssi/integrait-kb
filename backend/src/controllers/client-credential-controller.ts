import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ClientCredentialRepository } from '../repositories/client-credential-repository';
import { AppError } from '../middlewares/error-handler';
import { encrypt, decrypt } from '../utils/encryption';
import { safeText, deviceCredential } from '../utils/validators';

const createSchema = z.object({
  service: safeText.pipe(z.string().min(1, 'Servicio requerido')),
  username: safeText.optional(),
  password: deviceCredential.optional(),
  notes: safeText.optional(),
});

const updateSchema = z.object({
  service: safeText.optional(),
  username: safeText.nullable().optional(),
  password: deviceCredential.nullable().optional(),
  notes: safeText.nullable().optional(),
});

export const ClientCredentialController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await ClientCredentialRepository.findByClient(req.params.clientId);
      // Devuelve hasPassword sin exponer el valor cifrado
      const data = rows.map(({ encryptedPassword, ...r }) => ({
        ...r,
        hasPassword: !!encryptedPassword,
      }));
      res.json({ data });
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password, ...body } = createSchema.parse(req.body);
      const row = await ClientCredentialRepository.create({
        clientId: req.params.clientId,
        ...body,
        encryptedPassword: password ? encrypt(password) : null,
      });
      const { encryptedPassword, ...result } = row;
      res.status(201).json({ data: { ...result, hasPassword: !!encryptedPassword } });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const existing = await ClientCredentialRepository.findById(req.params.credId);
      if (!existing || existing.clientId !== req.params.clientId) {
        throw new AppError(404, 'Credencial no encontrada');
      }

      const { password, ...body } = updateSchema.parse(req.body);
      const updateData: Record<string, unknown> = { ...body };
      // null = borrar; string = actualizar; undefined = no tocar
      if (password !== undefined) {
        updateData.encryptedPassword = password ? encrypt(password) : null;
      }

      const row = await ClientCredentialRepository.update(req.params.credId, updateData);
      const { encryptedPassword, ...result } = row;
      res.json({ data: { ...result, hasPassword: !!encryptedPassword } });
    } catch (err) { next(err); }
  },

  async getPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const row = await ClientCredentialRepository.findById(req.params.credId);
      if (!row || row.clientId !== req.params.clientId) {
        throw new AppError(404, 'Credencial no encontrada');
      }
      res.json({
        data: {
          password: row.encryptedPassword ? decrypt(row.encryptedPassword) : null,
        },
      });
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const row = await ClientCredentialRepository.findById(req.params.credId);
      if (!row || row.clientId !== req.params.clientId) {
        throw new AppError(404, 'Credencial no encontrada');
      }
      await ClientCredentialRepository.delete(req.params.credId);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
