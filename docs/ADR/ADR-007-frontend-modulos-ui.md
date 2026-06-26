# ADR-007: Frontend — Módulos UI (Clientes, Técnicos, Incidentes)
**Fecha:** 2026-06-25
**Estado:** Aceptado

## Contexto
Con el shell y el sistema de autenticación listos, se implementan las páginas de los tres módulos principales del MVP.

## Decisión

### Patrón por módulo
Cada módulo sigue la misma estructura:
- `services/<module>.service.ts` — llamadas a la API con tipos
- `pages/<module>/<Module>Page.tsx` — lista con filtros/búsqueda
- `pages/<module>/<Module>DetailPage.tsx` — detalle (donde aplique)
- Queries con TanStack Query — `useQuery` para leer, `useMutation` para escribir

### Componentes compartidos a crear
- `StatusBadge` — badge de color según IncidentStatus
- `PriorityBadge` — badge de color según Priority
- `ConfirmDialog` — modal de confirmación para acciones destructivas
- `EmptyState` — placeholder cuando no hay datos
- `PageHeader` — título + botón de acción superior

### Módulo Clientes
- Lista: tabla con nombre, ciudad, RUT, estado activo/inactivo + búsqueda por nombre
- Detalle: 4 tabs — Información, Equipos, Funcionarios, Backups (placeholder)
- Formulario de creación/edición en Dialog
- Equipos y Funcionarios: listas inline con crear/editar/eliminar

### Módulo Técnicos (solo ADMIN)
- Lista: tabla con nombre, email, rol, estado
- Formulario de creación/edición en Dialog
- Desactivar con confirmación

### Módulo Incidentes
- Lista: tabla con título, cliente, estado, prioridad, técnico asignado + filtros
- Filtros: status, priority, clientId
- Detalle: información completa + formulario de solución + cambio de estado
- Crear incidente: formulario con selección de cliente, equipo, tags

## Consecuencias
- **Gana:** UX consistente, reutilización de componentes entre módulos
- **Sacrifica:** más archivos que un enfoque monolítico, pero más mantenible
