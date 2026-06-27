import ExcelJS from 'exceljs';
import { Equipment, Camera } from '@/types';

async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportEquipmentTemplate(clientName: string): void {
  void (async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Equipos');
    ws.addRow(['Nombre', 'IP', 'Marca', 'Modelo', 'Ubicacion', 'SO', 'Sucursal']);
    ws.addRow(['Servidor principal', '192.168.1.10', 'Dell', 'PowerEdge R640', 'Sala de servidores', 'Windows Server 2022', 'Casa central']);
    ws.columns = [20, 16, 14, 20, 20, 22, 18].map((width) => ({ width }));
    await downloadWorkbook(wb, `template-equipos-${clientName}.xlsx`);
  })();
}

export function exportEquipmentData(equipment: Equipment[], clientName: string): void {
  void (async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Equipos');
    ws.addRow(['Nombre', 'IP', 'Marca', 'Modelo', 'Ubicacion', 'SO']);
    for (const e of equipment) {
      ws.addRow([e.name, e.ip ?? '', e.brand ?? '', e.model ?? '', e.location ?? '', e.os ?? '']);
    }
    ws.columns = [20, 16, 14, 20, 20, 22].map((width) => ({ width }));
    await downloadWorkbook(wb, `equipos-${clientName}.xlsx`);
  })();
}

export function exportCamerasTemplate(clientName: string): void {
  void (async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Camaras');
    ws.addRow(['Nombre', 'IP', 'Canal', 'Ubicacion', 'Marca', 'Modelo', 'NVR', 'Sucursal']);
    ws.addRow(['CAM-01', '192.168.1.100', '1', 'Entrada principal', 'Hikvision', 'DS-2CD2143G2', 'NVR-Principal', 'Casa central']);
    ws.columns = [16, 16, 8, 22, 14, 20, 18, 18].map((width) => ({ width }));
    await downloadWorkbook(wb, `template-camaras-${clientName}.xlsx`);
  })();
}

export function exportCamerasData(cameras: Camera[], clientName: string): void {
  void (async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Camaras');
    ws.addRow(['Nombre', 'IP', 'Canal', 'Ubicacion', 'Marca', 'Modelo', 'NVR']);
    for (const c of cameras) {
      ws.addRow([c.name, c.ip ?? '', c.channel ?? '', c.location ?? '', c.brand ?? '', c.model ?? '', c.nvr?.name ?? '']);
    }
    ws.columns = [16, 16, 8, 22, 14, 20, 18].map((width) => ({ width }));
    await downloadWorkbook(wb, `camaras-${clientName}.xlsx`);
  })();
}
