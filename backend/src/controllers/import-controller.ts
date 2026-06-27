import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

const equipmentRowSchema = z.object({
  Nombre: z.string().min(1),
  IP: z.string().optional(),
  Marca: z.string().optional(),
  Modelo: z.string().optional(),
  Ubicacion: z.string().optional(),
  SO: z.string().optional(),
  Sucursal: z.string().optional(),
});

const cameraRowSchema = z.object({
  Nombre: z.string().min(1),
  IP: z.string().optional(),
  Canal: z.coerce.number().int().positive().optional(),
  Ubicacion: z.string().optional(),
  Marca: z.string().optional(),
  Modelo: z.string().optional(),
  NVR: z.string().optional(),
  Sucursal: z.string().optional(),
});

type ImportResult = {
  imported: number;
  errors: { row: number; message: string }[];
};

async function resolveBranch(clientId: string, branchName?: string): Promise<string | null> {
  if (!branchName?.trim()) return null;
  const branch = await prisma.branch.findFirst({
    where: { clientId, name: { equals: branchName.trim(), mode: 'insensitive' }, active: true },
  });
  return branch?.id ?? null;
}

async function resolveNvr(clientId: string, nvrName?: string): Promise<string | null> {
  if (!nvrName?.trim()) return null;
  const nvr = await prisma.nVR.findFirst({
    where: { clientId, name: { equals: nvrName.trim(), mode: 'insensitive' }, active: true },
  });
  return nvr?.id ?? null;
}

/** Lee una hoja Excel desde un buffer y retorna las filas como array de objetos, usando la primera fila como headers. */
async function sheetToRows(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
    headers.push(String(cell.value ?? ''));
  });

  const rows: Record<string, unknown>[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const obj: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const key = headers[colNum - 1];
      if (key) obj[key] = cell.value ?? '';
    });
    if (Object.values(obj).some((v) => v !== '')) rows.push(obj);
  });

  return rows;
}

export const ImportController = {
  async importEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = req.params.clientId;
      if (!req.file) {
        res.status(400).json({ error: 'No se recibió archivo' });
        return;
      }

      const rows = await sheetToRows(req.file.buffer);
      const result: ImportResult = { imported: 0, errors: [] };

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const parse = equipmentRowSchema.safeParse(rows[i]);
        if (!parse.success) {
          result.errors.push({ row: rowNum, message: parse.error.issues[0]?.message ?? 'Datos inválidos' });
          continue;
        }
        const d = parse.data;
        const branchId = await resolveBranch(clientId, d.Sucursal);
        await prisma.equipment.create({
          data: {
            clientId,
            branchId,
            name: d.Nombre,
            ip: d.IP || null,
            brand: d.Marca || null,
            model: d.Modelo || null,
            location: d.Ubicacion || null,
            os: d.SO || null,
          },
        });
        result.imported++;
      }

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async importCameras(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = req.params.clientId;
      if (!req.file) {
        res.status(400).json({ error: 'No se recibió archivo' });
        return;
      }

      const rows = await sheetToRows(req.file.buffer);
      const result: ImportResult = { imported: 0, errors: [] };

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const parse = cameraRowSchema.safeParse(rows[i]);
        if (!parse.success) {
          result.errors.push({ row: rowNum, message: parse.error.issues[0]?.message ?? 'Datos inválidos' });
          continue;
        }
        const d = parse.data;
        const branchId = await resolveBranch(clientId, d.Sucursal);
        const nvrId = await resolveNvr(clientId, d.NVR);
        await prisma.camera.create({
          data: {
            clientId,
            branchId,
            nvrId,
            name: d.Nombre,
            ip: d.IP || null,
            channel: d.Canal ?? null,
            location: d.Ubicacion || null,
            brand: d.Marca || null,
            model: d.Modelo || null,
          },
        });
        result.imported++;
      }

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
};
