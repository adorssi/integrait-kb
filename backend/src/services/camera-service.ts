import { CameraRepository } from '../repositories/camera-repository';
import { encrypt, decrypt } from '../utils/encryption';

export const CameraService = {
  async list(clientId: string, filters?: { nvrId?: string; search?: string }) {
    const cameras = await CameraRepository.findByClient(clientId, filters);
    return cameras.map(({ encryptedUsername, encryptedPassword, ...cam }) => cam);
  },

  async create(
    clientId: string,
    data: {
      nvrId?: string;
      name: string;
      ip?: string;
      channel?: number;
      location?: string;
      brand?: string;
      model?: string;
      username?: string;
      password?: string;
    },
  ) {
    const { username, password, ...rest } = data;
    return CameraRepository.create({
      ...rest,
      clientId,
      encryptedUsername: username ? encrypt(username) : undefined,
      encryptedPassword: password ? encrypt(password) : undefined,
    });
  },

  async update(
    id: string,
    data: {
      nvrId?: string | null;
      name?: string;
      ip?: string | null;
      channel?: number | null;
      location?: string | null;
      brand?: string | null;
      model?: string | null;
      username?: string | null;
      password?: string | null;
    },
  ) {
    const cam = await CameraRepository.findById(id);
    if (!cam) throw Object.assign(new Error('Cámara no encontrada'), { statusCode: 404 });

    const { username, password, ...rest } = data;
    return CameraRepository.update(id, {
      ...rest,
      ...(username !== undefined ? { encryptedUsername: username ? encrypt(username) : null } : {}),
      ...(password !== undefined ? { encryptedPassword: password ? encrypt(password) : null } : {}),
    });
  },

  async getCredentials(id: string) {
    const cam = await CameraRepository.findById(id);
    if (!cam) throw Object.assign(new Error('Cámara no encontrada'), { statusCode: 404 });
    return {
      username: cam.encryptedUsername ? decrypt(cam.encryptedUsername) : null,
      password: cam.encryptedPassword ? decrypt(cam.encryptedPassword) : null,
    };
  },

  async deactivate(id: string) {
    const cam = await CameraRepository.findById(id);
    if (!cam) throw Object.assign(new Error('Cámara no encontrada'), { statusCode: 404 });
    return CameraRepository.deactivate(id);
  },
};
