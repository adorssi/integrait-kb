# ADR-005: Módulo de Tags e Incidentes
**Fecha:** 2026-06-25
**Estado:** Aceptado

## Contexto
Tags e incidentes se implementan juntos porque los tags solo tienen sentido en el contexto de incidentes. Los incidentes son el núcleo del sistema: requieren cliente, técnico (opcional), estado, prioridad, tags y opcionalmente un equipo.

## Decisión

### Tags
Recurso simple: nombre único. Sin soft delete (si un tag está en uso no puede eliminarse).
- `GET /tags` — listar todos
- `POST /tags` — crear (ADMIN)

### Incidentes
Recurso central. Reglas de negocio críticas:
1. Solo se puede editar un incidente en estado OPEN
2. Transiciones de estado válidas: OPEN → IN_PROGRESS → RESOLVED
3. Para pasar a RESOLVED debe existir una Solution registrada
4. Solo ADMIN puede asignar técnico (`PATCH /incidents/:id/assign`)
5. El equipo asociado (equipmentId) debe pertenecer al mismo cliente del incidente

### Soluciones
Recurso dependiente del incidente:
- `POST /incidents/:id/solution` — registrar solución
- Un incidente ya resuelto no puede recibir otra solución (ya tiene una por la relación @unique)
- Al registrar la solución se cambia el estado a RESOLVED automáticamente

### Filtros en GET /incidents
Query params: `clientId`, `technicianId`, `status`, `priority`, `equipmentId`

### Capas
Tags: TagRepository → (sin service, lógica trivial) → TagController → TagRouter
Incidentes: IncidentRepository → IncidentService → IncidentController → IncidentRouter

## Interfaces definidas
```typescript
ICreateIncidentDTO  { title, description, clientId, priority?, technicianId?, tagIds?, equipmentId? }
IUpdateIncidentDTO  { title?, description?, priority?, tagIds? }
ICreateSolutionDTO  { description, timeSpentMinutes }
IIncidentFilters    { clientId?, technicianId?, status?, priority?, equipmentId? }
```

## Consecuencias
- **Gana:** reglas de negocio centralizadas en el servicio, fáciles de testear
- **Sacrifica:** nada relevante
