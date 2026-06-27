# ADR-013: Revocación inmediata de acceso al deshabilitar técnicos
**Fecha:** 2026-06-27
**Estado:** Aceptado

## Contexto

El middleware `authenticate` solo verifica la firma y expiración del JWT. Un técnico desactivado (`active: false`) sigue pudiendo hacer llamadas a la API con su token actual hasta que expire (hasta 8 horas). Esto viola el requisito de que la desactivación sea inmediata.

La funcionalidad de desactivar técnicos (UI + endpoint `PATCH /technicians/:id/deactivate`) ya existe. La brecha está en el enforcement del estado activo en cada request.

## Decisión

Agregar una verificación de `active: true` en la base de datos dentro del middleware `authenticate`, después de validar la firma del JWT. Si el técnico no existe o está inactivo, se devuelve HTTP 401.

## Consecuencias

**Se gana:**
- Desactivación inmediata: en el primer request posterior a la desactivación, el técnico recibe 401.
- El interceptor de Axios en el frontend ya maneja el 401: limpia localStorage y redirige a /login.
- Sin cambios en el frontend ni en las rutas.

**Se sacrifica:**
- Una query a la base de datos por cada request autenticado.
- Para el volumen de una app interna de equipo IT (< 50 usuarios), el impacto es despreciable.

**Alternativas descartadas:**
- Token blacklist: requiere Redis u otro almacenamiento compartido — overkill para esta fase.
- JWT de corta duración + refresh tokens: cambia el flujo de autenticación completo — fuera del alcance del MVP.
