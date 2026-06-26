# ADR-002: Módulo de Autenticación
**Fecha:** 2026-06-25
**Estado:** Aceptado

## Contexto
El sistema necesita identificar quién hace cada request y qué puede hacer. Todos los endpoints (salvo el login) requieren un JWT válido. Hay dos roles: ADMIN y TECHNICIAN.

## Decisión

### Endpoints
- `POST /auth/login` — público, recibe email+password, devuelve JWT + datos del técnico
- `GET /auth/me` — protegido, devuelve datos del técnico autenticado (sin passwordHash)

### Flujo de login
1. Validar body con Zod (email válido, password no vacío)
2. Buscar técnico por email en BD
3. Verificar que `active === true` (técnicos desactivados no pueden loguear)
4. Comparar password con bcrypt
5. Firmar JWT con payload: `{ sub: id, email, role }`
6. Devolver token + datos del técnico (sin passwordHash)

### JWT
- Secret desde `JWT_SECRET` (env)
- Expiración desde `JWT_EXPIRES_IN` (env, default 8h)
- Payload mínimo: no incluir datos sensibles

### Capas
- `AuthController` — maneja HTTP, llama al servicio
- `AuthService` — lógica de negocio (verificar password, firmar token)
- `TechnicianRepository` — acceso a BD (findByEmail, findById)

### Interfaces definidas
```typescript
ILoginDTO       { email: string; password: string }
IAuthResponse   { token: string; technician: ITechnicianPublic }
ITechnicianPublic = Omit<ITechnician, 'passwordHash'>
```

## Consecuencias
- **Gana:** auth desacoplada, fácil de testear, repositorio reutilizable para el módulo de técnicos
- **Sacrifica:** nada relevante en este alcance
