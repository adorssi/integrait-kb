# ADR-016: Edición de perfil propio para todos los usuarios
**Fecha:** 2026-07-01
**Estado:** Aceptado

**Contexto:** Los técnicos y admins no tienen forma de cambiar su propio nombre ni contraseña desde la app. Actualmente solo un admin puede editar otros técnicos, pero no hay endpoint ni UI para que cada usuario edite su propio perfil.

**Decisión:**
- Nuevo endpoint `PUT /auth/me` accesible por cualquier usuario autenticado.
- Permite actualizar `name` (opcional) y `password` (opcional).
- Si se envía `password`, se requiere también `currentPassword` para verificar antes de actualizar.
- Nueva página `/profile` en el frontend accesible desde el menú de usuario.

**Consecuencias:**
- Cualquier usuario puede autogestionar su nombre y contraseña sin depender del admin.
- El admin sigue siendo el único que puede editar el email y el rol de otros técnicos.
- No se expone el `passwordHash` en ninguna respuesta.
