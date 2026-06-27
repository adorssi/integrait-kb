# ADR-012: Validación de inputs, bloqueo de cuentas y propagación de credenciales
**Fecha:** 2026-06-27
**Estado:** Aceptado

## Contexto

El MVP v1.0 no tenía validación de longitud máxima en los schemas Zod, lo que permite strings arbitrariamente largos en la base de datos. Tampoco había protección ante ataques de fuerza bruta en el login, ni una forma eficiente de asignar la misma credencial a múltiples cámaras o NVRs de un cliente.

## Decisiones

### 1. Validación de inputs

- Crear `backend/src/utils/validators.ts` con helpers Zod reutilizables: `safeName` (max 100), `safeText` (max 5000), `safeEmail` (max 255), `ipAddress` (formato regex + rango), `cidrRange`, `strongPassword` (min 8, uppercase, número, especial), `deviceCredential` (max 200).
- Aplicar estos helpers en todos los controllers: `technician`, `nvr`, `camera`, `client`, `incident`.
- El filtro `noHtml` (`!/[<>]/`) en campos de texto libre previene inyección HTML básica sin depender de una librería externa.
- Las contraseñas de dispositivos (NVR, cámara) NO tienen restricción de complejidad porque las define el fabricante.

### 2. Bloqueo de cuentas

- Agregar dos campos a `Technician` en Prisma: `failedLoginAttempts Int @default(0)` y `lockedUntil DateTime?`.
- Después de 5 intentos fallidos:
  - **Rol ADMIN**: bloqueo temporal de 5 minutos (`lockedUntil = now + 5 min`). Se autodesbloquea al expirar.
  - **Otros roles**: bloqueo permanente (`lockedUntil = 2099-12-31`). Requiere desbloqueo manual por admin.
- HTTP 423 con `{ error, retryAfterSeconds? }`. El campo `retryAfterSeconds` solo se incluye en bloqueos temporales.
- El admin puede desbloquear cualquier cuenta vía `PATCH /technicians/:id/unlock`.
- `failedLoginAttempts` se reinicia en login exitoso y al desbloquear manualmente.
- `failedLoginAttempts` NO se expone en la API (se excluye en `toPublic`). `lockedUntil` sí se expone para que el admin pueda ver qué cuentas están bloqueadas.

### 3. Propagación de credenciales

- Implementación **solo en el frontend**: no se necesita un nuevo endpoint porque `PUT /clients/:clientId/nvrs/:nvrId` y `PUT /clients/:clientId/cameras/:cameraId` ya aceptan `username` y `password` opcionales.
- Después de guardar un NVR o cámara con credenciales (username o password no vacíos), se ofrece un dialog de propagación.
- El dialog muestra una lista de otros NVRs (si se guardó un NVR) o cámaras (si se guardó una cámara) con checkboxes.
- Al confirmar, se llama al endpoint de actualización de cada destino seleccionado con `{ username, password }`.
- La lógica de propagación también está disponible desde el `CredentialsBadge` (componente que muestra credenciales en lectura).

## Consecuencias

**Se gana:**
- Protección básica ante fuerza bruta y payloads maliciosos.
- Flujo eficiente para clonar credenciales entre dispositivos de un mismo cliente.
- Requisitos de contraseña claros para usuarios del sistema.

**Se sacrifica:**
- El bloqueo permanente de cuentas no-admin requiere intervención del admin (no auto-expira).
- La propagación hace múltiples llamadas HTTP en secuencia (una por dispositivo); para clientes con decenas de cámaras puede ser lento, pero es aceptable para el tamaño actual de la base de datos.
