import * as XLSX from 'xlsx';
import { Equipment, Camera } from '@/types';

function download(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export function exportEquipmentTemplate(clientName: string) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nombre', 'IP', 'Marca', 'Modelo', 'Ubicacion', 'SO', 'Sucursal'],
    ['Servidor principal', '192.168.1.10', 'Dell', 'PowerEdge R640', 'Sala de servidores', 'Windows Server 2022', 'Casa central'],
  ]);
  ws['!cols'] = [20, 16, 14, 20, 20, 22, 18].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
  download(wb, `template-equipos-${clientName}.xlsx`);
}

export function exportEquipmentData(equipment: Equipment[], clientName: string) {
  const rows = equipment.map(e => [
    e.name, e.ip ?? '', e.brand ?? '', e.model ?? '', e.location ?? '', e.os ?? '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nombre', 'IP', 'Marca', 'Modelo', 'Ubicacion', 'SO'],
    ...rows,
  ]);
  ws['!cols'] = [20, 16, 14, 20, 20, 22].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
  download(wb, `equipos-${clientName}.xlsx`);
}

export function exportCamerasTemplate(clientName: string) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nombre', 'IP', 'Canal', 'Ubicacion', 'Marca', 'Modelo', 'NVR', 'Sucursal'],
    ['CAM-01', '192.168.1.100', '1', 'Entrada principal', 'Hikvision', 'DS-2CD2143G2', 'NVR-Principal', 'Casa central'],
  ]);
  ws['!cols'] = [16, 16, 8, 22, 14, 20, 18, 18].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Camaras');
  download(wb, `template-camaras-${clientName}.xlsx`);
}

export function exportCamerasData(cameras: Camera[], clientName: string) {
  const rows = cameras.map(c => [
    c.name, c.ip ?? '', c.channel ?? '', c.location ?? '',
    c.brand ?? '', c.model ?? '', c.nvr?.name ?? '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nombre', 'IP', 'Canal', 'Ubicacion', 'Marca', 'Modelo', 'NVR'],
    ...rows,
  ]);
  ws['!cols'] = [16, 16, 8, 22, 14, 20, 18].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Camaras');
  download(wb, `camaras-${clientName}.xlsx`);
}
