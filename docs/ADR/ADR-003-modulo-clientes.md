# ADR-003: Módulo de Clientes
**Fecha:** 2026-06-25
**Estado:** Aceptado

## Contexto
El módulo de clientes necesita ir más allá del CRUD básico. Cada cliente tiene equipos asociados, funcionarios de contacto, un historial de incidentes y una sección de backups (placeholder hasta integrar Gmail).

## Decisión

### Cambios al schema existente

**Client** — agregar campos:
- `city: String`
- `rut: String` (único por empresa)
- `phone: String`

**Incident** — agregar campo opcional:
- `equipmentId: String?` — un incidente puede asociarse a un equipo específico

**Modelos nuevos:**

**Equipment** — equipo de un cliente:
- `id, name, ip?, brand?, model?, location?, os?, active, clientId`
- Soft delete con `active`
- Relación con Incident (un incidente puede referenciar un equipo)

**Contact** (Funcionario) — contacto de un cliente:
- `id, name, email?, phone?, clientId`
- Sin soft delete — se elimina directamente (no es un recurso crítico)

**BackupJob** — placeholder para futura integración Gmail:
- `id, clientId, taskName, result (enum), occurredAt, rawSubject`
- Se crea el modelo y la tabla ahora, sin lógica de sincronización
- Permite que el frontend muestre el widget calendario cuando llegue la integración

### Endpoints nuevos

**Clientes:**
- `GET /clients` — listar activos (con paginación y búsqueda por nombre)
- `GET /clients/:id` — detalle: datos + equipos + funcionarios + últimos incidentes
- `POST /clients` — crear (ADMIN)
- `PUT /clients/:id` — editar (ADMIN)
- `PATCH /clients/:id/deactivate` — desactivar (ADMIN)

**Equipos:**
- `GET /clients/:clientId/equipment` — listar equipos activos del cliente
- `GET /clients/:clientId/equipment/:id` — detalle del equipo + últimos incidentes del equipo
- `POST /clients/:clientId/equipment` — crear equipo (ADMIN)
- `PUT /clients/:clientId/equipment/:id` — editar (ADMIN)
- `PATCH /clients/:clientId/equipment/:id/deactivate` — desactivar (ADMIN)

**Funcionarios:**
- `GET /clients/:clientId/contacts` — listar funcionarios
- `POST /clients/:clientId/contacts` — crear (ADMIN)
- `PUT /clients/:clientId/contacts/:id` — editar (ADMIN)
- `DELETE /clients/:clientId/contacts/:id` — eliminar (ADMIN)

**Backups (placeholder):**
- `GET /clients/:clientId/backups` — lista vacía por ahora, estructura lista para integración

### Capas por módulo
Cada recurso sigue la misma estructura: Repository → Service → Controller → Router

### Impacto en módulos existentes
- Schema Incident: agregar `equipmentId` opcional — migración no destructiva
- Schema Client: agregar `city`, `rut`, `phone` — migración no destructiva (valores pueden ser vacíos inicialmente)

## Consecuencias
- **Gana:** estructura lista para Gmail sin refactor futuro; historial por equipo desde el día 1
- **Sacrifica:** migración más grande de lo habitual para un solo módulo
