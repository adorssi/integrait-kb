import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ClientWifiRepository } from '../repositories/client-wifi-repository';
import { AppError } from '../middlewares/error-handler';
import { encrypt, decrypt } from '../utils/encryption';
import { safeText, deviceCredential } from '../utils/validators';

const createSchema = z.object({
  ssid: safeText.pipe(z.string().min(1, 'SSID requerido')),
  password: deviceCredential.optional(),
  location: safeText.optional(),
  notes: safeText.optional(),
});

const updateSchema = z.object({
  ssid: safeText.optional(),
  password: deviceCredential.nullable().optional(),
  location: safeText.nullable().optional(),
  notes: safeText.nullable().optional(),
});

export const ClientWifiController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await ClientWifiRepository.findByClient(req.params.clientId);
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
      const row = await ClientWifiRepository.create({
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
      const existing = await ClientWifiRepository.findById(req.params.wifiId);
      if (!existing || existing.clientId !== req.params.clientId) {
        throw new AppError(404, 'Red WiFi no encontrada');
      }

      const { password, ...body } = updateSchema.parse(req.body);
      const updateData: Record<string, unknown> = { ...body };
      if (password !== undefined) {
        updateData.encryptedPassword = password ? encrypt(password) : null;
      }

      const row = await ClientWifiRepository.update(req.params.wifiId, updateData);
      const { encryptedPassword, ...result } = row;
      res.json({ data: { ...result, hasPassword: !!encryptedPassword } });
    } catch (err) { next(err); }
  },

  async getPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const row = await ClientWifiRepository.findById(req.params.wifiId);
      if (!row || row.clientId !== req.params.clientId) {
        throw new AppError(404, 'Red WiFi no encontrada');
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
      const row = await ClientWifiRepository.findById(req.params.wifiId);
      if (!row || row.clientId !== req.params.clientId) {
        throw new AppError(404, 'Red WiFi no encontrada');
      }
      await ClientWifiRepository.delete(req.params.wifiId);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
