# API Reference — IT Knowledge Base MVP v1.0

**Base URL:** `http://localhost:3000`
**Autenticación:** Bearer JWT en header `Authorization`

---

## Health Check

### GET /health

**Descripción:** Verifica que el servidor está operativo.
**Auth:** No requerida.

**Respuesta 200:**
```json
{ "status": "ok", "timestamp": "2026-06-25T00:00:00.000Z" }
```

---

## Auth

### POST /auth/login

**Descripción:** Autentica un técnico y devuelve un JWT.
**Auth:** No requerida.

**Request body:**
```json
{
  "email": "string (requerido, formato email)",
  "password": "string (requerido)"
}
```

**Respuestas:**
- `200` — Login exitoso
- `400` — Datos inválidos (email malformado, password vacío)
- `401` — Credenciales inválidas o cuenta desactivada

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@empresa.com", "password": "Admin1234!"}'
```

**Respuesta 200:**
```json
{
  "token": "eyJhbGci...",
  "technician": {
    "id": "uuid",
    "name": "Administrador",
    "email": "admin@empresa.com",
    "role": "ADMIN",
    "active": true,
    "createdAt": "2026-06-25T00:00:00.000Z",
    "updatedAt": "2026-06-25T00:00:00.000Z"
  }
}
```

---

### GET /auth/me

**Descripción:** Devuelve los datos del técnico autenticado.
**Auth:** Bearer JWT requerido. Roles: TECHNICIAN, ADMIN.

**Respuestas:**
- `200` — Datos del técnico
- `401` — Token ausente o inválido
- `404` — Técnico no encontrado (borde: eliminado tras login)

**Ejemplo:**
```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer TOKEN"
```

**Respuesta 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Administrador",
    "email": "admin@empresa.com",
    "role": "ADMIN",
    "active": true,
    "createdAt": "2026-06-25T00:00:00.000Z",
    "updatedAt": "2026-06-25T00:00:00.000Z"
  }
}
```

---

## Técnicos

> Todos los endpoints requieren token ADMIN. TECHNICIAN recibe 403.
> `passwordHash` nunca aparece en ninguna respuesta.

### GET /technicians
**Descripción:** Lista todos los técnicos (activos e inactivos).
**Auth:** Bearer JWT. Roles: ADMIN.
**Respuesta 200:** `{ "data": [{ id, name, email, role, active, createdAt, updatedAt }] }`

---

### GET /technicians/:id
**Descripción:** Detalle de un técnico.
**Auth:** Bearer JWT. Roles: ADMIN.
**Respuestas:** 200 / 401 / 403 / 404

---

### POST /technicians
**Descripción:** Crea un nuevo técnico.
**Auth:** Bearer JWT. Roles: ADMIN.
**Body:**
```json
{
  "name": "string (requerido)",
  "email": "string (requerido, formato email)",
  "password": "string (requerido, mínimo 8 caracteres)",
  "role": "TECHNICIAN | ADMIN (opcional, default TECHNICIAN)"
}
```
**Respuestas:** 201 / 400 / 401 / 403 / 409 (email duplicado)

---

### PUT /technicians/:id
**Descripción:** Edita un técnico. Todos los campos son opcionales. Si se envía `password`, se hashea.
**Auth:** Bearer JWT. Roles: ADMIN.
**Respuestas:** 200 / 400 / 401 / 403 / 404 / 409

---

### PATCH /technicians/:id/deactivate
**Descripción:** Desactiva un técnico (soft delete). No se puede desactivar la propia cuenta.
**Auth:** Bearer JWT. Roles: ADMIN.
**Respuestas:** 200 / 400 (auto-desactivación) / 401 / 403 / 404

---

## Clientes

### GET /clients
**Descripción:** Lista todos los clientes activos. Búsqueda opcional por nombre.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Query params:** `search` (opcional) — filtra por nombre (case-insensitive).

```bash
curl http://localhost:3000/clients?search=empresa \
  -H "Authorization: Bearer TOKEN"
```
**Respuesta 200:** `{ "data": [{ id, name, city, rut, phone, active, ... }] }`

---

### GET /clients/:id
**Descripción:** Datos básicos de un cliente.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Respuestas:** 200 / 401 / 404

---

### GET /clients/:id/detail
**Descripción:** Detalle completo del cliente: datos + equipos activos + funcionarios + últimos 20 incidentes.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Respuestas:** 200 / 401 / 404

---

### POST /clients
**Descripción:** Crea un nuevo cliente.
**Auth:** Bearer JWT. Roles: ADMIN.
**Body:**
```json
{
  "name": "string (requerido)",
  "city": "string (requerido)",
  "rut": "string (requerido, único)",
  "phone": "string (requerido)",
  "notes": "string (opcional)"
}
```
**Respuestas:** 201 / 400 / 401 / 403 / 409 (RUT duplicado)

---

### PUT /clients/:id
**Descripción:** Edita un cliente. Todos los campos son opcionales.
**Auth:** Bearer JWT. Roles: ADMIN.
**Respuestas:** 200 / 400 / 401 / 403 / 404 / 409

---

### PATCH /clients/:id/deactivate
**Descripción:** Desactiva un cliente (soft delete).
**Auth:** Bearer JWT. Roles: ADMIN.
**Respuestas:** 200 / 401 / 403 / 404

---

### GET /clients/:clientId/equipment
**Descripción:** Lista los equipos activos de un cliente.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Respuestas:** 200 / 401 / 404

---

### GET /clients/:clientId/equipment/:id
**Descripción:** Detalle de un equipo con sus últimos 20 incidentes asociados.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Respuestas:** 200 / 401 / 404

---

### POST /clients/:clientId/equipment
**Descripción:** Agrega un equipo a un cliente.
**Auth:** Bearer JWT. Roles: ADMIN.
**Body:**
```json
{
  "name": "string (requerido)",
  "ip": "string (opcional)",
  "brand": "string (opcional)",
  "model": "string (opcional)",
  "location": "string (opcional)",
  "os": "string (opcional)"
}
```
**Respuestas:** 201 / 400 / 401 / 403 / 404

---

### PUT /clients/:clientId/equipment/:id
**Descripción:** Edita un equipo.
**Auth:** Bearer JWT. Roles: ADMIN.
**Respuestas:** 200 / 400 / 401 / 403 / 404

---

### PATCH /clients/:clientId/equipment/:id/deactivate
**Descripción:** Desactiva un equipo (soft delete).
**Auth:** Bearer JWT. Roles: ADMIN.
**Respuestas:** 200 / 401 / 403 / 404

---

### GET /clients/:clientId/contacts
**Descripción:** Lista los funcionarios de un cliente.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Nota frontend:** el campo `phone` puede usarse para generar enlace WhatsApp: `https://wa.me/PHONE`.
**Respuestas:** 200 / 401 / 404

---

### POST /clients/:clientId/contacts
**Descripción:** Agrega un funcionario a un cliente.
**Auth:** Bearer JWT. Roles: ADMIN.
**Body:**
```json
{
  "name": "string (requerido)",
  "email": "string (opcional, formato email)",
  "phone": "string (opcional)"
}
```
**Respuestas:** 201 / 400 / 401 / 403 / 404

---

### PUT /clients/:clientId/contacts/:id
**Descripción:** Edita un funcionario.
**Auth:** Bearer JWT. Roles: ADMIN.
**Respuestas:** 200 / 400 / 401 / 403 / 404

---

### DELETE /clients/:clientId/contacts/:id
**Descripción:** Elimina un funcionario.
**Auth:** Bearer JWT. Roles: ADMIN.
**Respuestas:** 204 / 401 / 403 / 404

---

### GET /clients/:clientId/backups
**Descripción:** Placeholder — retorna lista vacía hasta integración Gmail.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Respuesta 200:** `{ "data": [], "meta": { "placeholder": true, "message": "..." } }`

---

## Tags

### GET /tags
**Descripción:** Lista todos los tags disponibles.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Respuesta 200:** `{ "data": [{ id, name }] }`

---

### POST /tags
**Descripción:** Crea un nuevo tag. El nombre se convierte a minúsculas automáticamente.
**Auth:** Bearer JWT. Roles: ADMIN.
**Body:** `{ "name": "string (requerido)" }`
**Respuestas:** 201 / 400 / 401 / 403 / 409 (nombre duplicado)

---

## Incidentes

> **Estados y transiciones válidas:** OPEN → IN_PROGRESS → RESOLVED
> Para pasar a RESOLVED debe existir una solución registrada.

### GET /incidents
**Descripción:** Lista incidentes con filtros opcionales.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Query params:** `clientId`, `technicianId`, `status`, `priority`, `equipmentId` (todos opcionales, UUID o enum).

```bash
curl "http://localhost:3000/incidents?status=OPEN&priority=HIGH" \
  -H "Authorization: Bearer TOKEN"
```
**Respuesta 200:** `{ "data": [{ id, title, status, priority, client, assignedTo, equipment, tags, solution, ... }] }`

---

### GET /incidents/:id
**Descripción:** Detalle completo de un incidente.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Respuestas:** 200 / 401 / 404

---

### POST /incidents
**Descripción:** Crea un nuevo incidente.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Body:**
```json
{
  "title": "string (requerido)",
  "description": "string (requerido)",
  "clientId": "uuid (requerido)",
  "priority": "LOW | MEDIUM | HIGH | CRITICAL (opcional, default MEDIUM)",
  "technicianId": "uuid (opcional)",
  "equipmentId": "uuid (opcional — debe pertenecer al cliente)",
  "tagIds": ["uuid"] "(opcional)"
}
```
**Respuestas:** 201 / 400 / 401 / 404

---

### PUT /incidents/:id
**Descripción:** Edita un incidente. Solo permitido si el estado es OPEN.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Body:** `title?`, `description?`, `priority?`, `tagIds?`
**Respuestas:** 200 / 400 (no OPEN) / 401 / 404

---

### PATCH /incidents/:id/status
**Descripción:** Cambia el estado del incidente.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Body:** `{ "status": "OPEN | IN_PROGRESS | RESOLVED" }`
**Nota:** Para RESOLVED se requiere solución previa. Transiciones inválidas retornan 400.
**Respuestas:** 200 / 400 / 401 / 404

---

### PATCH /incidents/:id/assign
**Descripción:** Asigna o desasigna un técnico al incidente.
**Auth:** Bearer JWT. Roles: ADMIN.
**Body:** `{ "technicianId": "uuid | null" }`
**Respuestas:** 200 / 400 / 401 / 403 / 404

---

### POST /incidents/:id/solution
**Descripción:** Registra la solución y cambia el estado a RESOLVED automáticamente.
**Auth:** Bearer JWT. Roles: TECHNICIAN, ADMIN.
**Body:**
```json
{
  "description": "string (requerido, mínimo 20 caracteres)",
  "timeSpentMinutes": "number (requerido, entero positivo)"
}
```
**Respuestas:** 201 / 400 / 401 / 404
