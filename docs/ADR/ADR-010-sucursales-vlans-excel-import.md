# ADR-010: Sucursales, Segmentos de Red e Importación/Exportación Excel

**Fecha:** 2026-06-27
**Estado:** Aceptado

## Contexto

Un cliente puede operar desde múltiples ubicaciones físicas (sucursales). Cada sucursal tiene su propia infraestructura de red: IP pública (fija o dinámica), ISP, y uno o más segmentos de red privados (VLANs). Además, se requiere poder exportar plantillas Excel para cámaras y equipos, y reimportarlas con datos pre-cargados.

## Decisión

### Modelo de datos nuevo

**Branch**: representa una sucursal física de un cliente.
- Campos: id, clientId, name, address?, publicIp?, dynamicIp (boolean), isp?, active, timestamps
- Relaciones: pertenece a Client; tiene muchos NetworkSegment, NVR, Camera, Equipment

**NetworkSegment**: un segmento de red (VLAN) dentro de una sucursal.
- Campos: id, branchId, vlan (Int?), networkRange, description?, active, timestamps

**NVR, Camera, Equipment**: reciben branchId? opcional (FK a Branch). No obligatorio para no romper datos existentes.

Los campos `publicIp`, `isp`, `networkRange` del modelo `Client` se conservan como legado. Cuando un cliente tiene sucursales, la información de red se gestiona desde ahí.

### Excel import/export

- Librería: `xlsx` (SheetJS) v0.18+ en backend y frontend
- Export template + datos existentes: generado en el **frontend** con TanStack Query data (evita round-trip)
- Import: upload `multipart/form-data` al backend, validación Zod por fila, inserción batch, respuesta con filas importadas / errores por fila
- Endpoints: `POST /clients/:clientId/equipment/import` y `POST /clients/:clientId/cameras/import`
- Middleware multipart: `multer` (in-memory storage, límite 5MB)

## Consecuencias

**Gana:**
- Modelo correcto para clientes multi-sucursal
- Carga masiva de cámaras y equipos via Excel (ahorra tiempo de alta)
- Sin cambios breaking en endpoints existentes

**Sacrifica:**
- Migración de DB con nuevas tablas
- `multer` como nueva dependencia de backend
- `xlsx` como nueva dependencia en ambos lados
