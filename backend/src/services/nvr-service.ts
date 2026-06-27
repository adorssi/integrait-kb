import { NVRRepository } from '../repositories/nvr-repository';
import { encrypt, decrypt } from '../utils/encryption';

export const NVRService = {
  async list(clientId: string) {
    const nvrs = await NVRRepository.findByClient(clientId);
    // Las credenciales nunca se incluyen en el listado
    return nvrs.map(({ encryptedUsername, encryptedPassword, ...nvr }) => ({
      ...nvr,
      hasCredentials: !!(encryptedUsername || encryptedPassword),
    }));
  },

  async create(
    clientId: string,
    data: {
      name: string;
      ip: string;
      port?: number;
      brand?: string;
      model?: string;
      serialNumber?: string;
      verificationCode?: string;
      channels?: number;
      notes?: string;
      username?: string;
      password?: string;
    },
  ) {
    const { username, password, ...rest } = data;
    return NVRRepository.create({
      ...rest,
      clientId,
      encryptedUsername: username ? encrypt(username) : undefined,
      encryptedPassword: password ? encrypt(password) : undefined,
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      ip?: string;
      port?: number | null;
      brand?: string | null;
      model?: string | null;
      serialNumber?: string | null;
      verificationCode?: string | null;
      channels?: number | null;
      notes?: string | null;
      username?: string | null;
      password?: string | null;
    },
  ) {
    const nvr = await NVRRepository.findById(id);
    if (!nvr) throw Object.assign(new Error('NVR no encontrado'), { statusCode: 404 });

    const { username, password, ...rest } = data;
    return NVRRepository.update(id, {
      ...rest,
      // null = borrar credencial; string = actualizar; undefined = no tocar
      ...(username !== undefined ? { encryptedUsername: username ? encrypt(username) : null } : {}),
      ...(password !== undefined ? { encryptedPassword: password ? encrypt(password) : null } : {}),
    });
  },

  async getCredentials(id: string) {
    const nvr = await NVRRepository.findById(id);
    if (!nvr) throw Object.assign(new Error('NVR no encontrado'), { statusCode: 404 });
    return {
      username: nvr.encryptedUsername ? decrypt(nvr.encryptedUsername) : null,
      password: nvr.encryptedPassword ? decrypt(nvr.encryptedPassword) : null,
    };
  },

  async deactivate(id: string) {
    const nvr = await NVRRepository.findById(id);
    if (!nvr) throw Object.assign(new Error('NVR no encontrado'), { statusCode: 404 });
    return NVRRepository.deactivate(id);
  },
};
