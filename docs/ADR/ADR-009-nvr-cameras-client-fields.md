# ADR-009: Módulo de Cámaras/NVRs y ampliación de datos de cliente
**Fecha:** 2026-06-26
**Estado:** Aceptado

## Contexto
Se necesita:
1. Ampliar la ficha del cliente con datos estructurados de infraestructura y contrato (hoy todo va a un campo `notes` libre).
2. Gestionar NVRs y cámaras IP de cada cliente, con filtros por nombre, IP y NVR.
3. Almacenar credenciales de acceso (usuario/contraseña) de NVRs y cámaras de forma segura.

## Decisiones

### Ampliación de Client
Se agregan campos opcionales: `email`, `address`, `publicIp`, `isp`, `networkRange`, `contractStart`, `contractEnd`, `servicePlan`. Todos opcionales para no romper registros existentes.

### Modelo NVR
Un cliente tiene N NVRs. Un NVR tiene N cámaras. Las cámaras también guardan `clientId` directamente (desnormalización) para poder filtrar "todas las cámaras del cliente" sin JOIN extra.

### Credenciales — cifrado AES-256-GCM
- Almacenadas cifradas en DB (`encryptedUsername`, `encryptedPassword`).
- Clave en variable de entorno `ENCRYPTION_KEY` (32 bytes, base64).
- Nunca incluidas en respuestas de listado.
- Solo se devuelven via `GET /clients/:id/nvrs/:nvrId/credentials` o `GET /clients/:id/cameras/:cameraId/credentials`, ambos con `requireRole(ADMIN)`.
- En el frontend: campos enmascarados con ícono de ojo, solo visible para ADMIN.

### Soft delete en NVRs y Cámaras
`active: Boolean @default(true)`. Nunca se eliminan registros.

## Consecuencias
- Requiere nueva variable de entorno `ENCRYPTION_KEY`.
- Requiere migración de BD: `add-nvr-cameras-client-fields`.
- Los técnicos (rol TECHNICIAN) nunca ven credenciales.
- Si se pierde `ENCRYPTION_KEY`, los datos cifrados no son recuperables — debe respaldarse.
