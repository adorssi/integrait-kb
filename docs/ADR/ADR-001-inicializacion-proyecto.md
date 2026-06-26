# ADR-001: Inicialización del Proyecto IT Knowledge Base MVP v1.0
**Fecha:** 2026-06-25
**Estado:** Aceptado

## Contexto
Se necesita arrancar el proyecto desde cero. El objetivo es tener un backend funcional con Express + TypeScript + Prisma conectado a PostgreSQL, con toda la estructura de carpetas definida en el CLAUDE.md y el schema de base de datos aplicado.

## Decisión

### Estructura de carpetas
Se adopta exactamente la estructura definida en CLAUDE.md:
- `backend/src/` con subdirectorios: controllers, services, repositories, middlewares, models, routes, utils
- `frontend/src/` con subdirectorios: components, pages, hooks, services, types
- `docs/ADR/` para decisiones de arquitectura

### Backend
- **Runtime:** Node.js con TypeScript estricto (`strict: true` en tsconfig)
- **Framework:** Express 4.x
- **ORM:** Prisma con cliente generado automáticamente
- **Validación:** Zod (instalado desde el inicio, será usado en todos los endpoints)
- **Autenticación:** jsonwebtoken + bcrypt (preparados aunque los endpoints de auth se implementan en una feature posterior)

### Base de datos
- PostgreSQL local (sin Docker en MVP)
- Schema exactamente como define CLAUDE.md: Client, Technician, Incident, Solution, Tag
- `active` en Client y Technician para soft delete
- Solution sin `embedding` (se agrega en fase IA)
- Regla de negocio: RESOLVED solo si existe Solution — se aplica a nivel de servicio

### Sin IA en esta fase
- No se instala ningún paquete relacionado con IA, embeddings o LLMs
- No se configura `ANTHROPIC_API_KEY`

## Interfaces TypeScript definidas (en `backend/src/models/`)

```typescript
// types.ts — tipos compartidos que reflejan el schema Prisma
Role, IncidentStatus, Priority (enums)
IClient, ITechnician, IIncident, ISolution, ITag (interfaces de dominio)
ICreateClientDTO, ICreateTechnicianDTO, ICreateIncidentDTO, ICreateSolutionDTO (DTOs)
IAuthPayload, IAuthResponse (auth)
IApiResponse<T>, IPaginatedResponse<T> (respuestas API)
```

## Consecuencias
- **Gana:** base sólida y tipada desde el día 1; migraciones versionadas con Prisma; estructura escalable
- **Sacrifica:** algo de tiempo de setup inicial antes de poder escribir lógica de negocio
