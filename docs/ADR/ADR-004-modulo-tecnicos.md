# ADR-004: Módulo de Técnicos
**Fecha:** 2026-06-25
**Estado:** Aceptado

## Contexto
El sistema necesita gestión de técnicos. Solo ADMIN puede crear, editar y desactivar técnicos. Los técnicos no se eliminan (soft delete con `active`). El TechnicianRepository ya existe — se reutiliza y se extiende.

## Decisión

### Endpoints
- `GET /technicians` — listar todos (ADMIN)
- `GET /technicians/:id` — ver detalle (ADMIN)
- `POST /technicians` — crear (ADMIN)
- `PUT /technicians/:id` — editar (ADMIN)
- `PATCH /technicians/:id/deactivate` — desactivar (ADMIN)

### Reglas de negocio
- Email único — verificar antes de crear y antes de editar
- Password hasheado con bcrypt (12 rounds) al crear y al editar
- `passwordHash` nunca se expone en ninguna respuesta
- No se puede desactivar al propio técnico autenticado (evitar quedarse sin acceso)
- Soft delete: `active = false`, nunca DELETE físico

### Reutilización
- `TechnicianRepository` ya tiene `findByEmail` y `findById` — se agregan `findAll`, `create`, `update`, `deactivate`
- `toPublic()` ya existe en auth-service — se mueve a un helper compartido en utils

### Cambio en auth-service
`toPublic()` se extrae a `utils/technician-utils.ts` para ser reutilizada en TechnicianService y AuthService sin duplicar código.

## Consecuencias
- **Gana:** reutilización del repositorio existente, sin duplicación de lógica de hash
- **Sacrifica:** pequeño refactor en auth-service para mover toPublic
