# ADR-014: Re-autenticación antes de revelar credenciales de dispositivos
**Fecha:** 2026-06-27
**Estado:** Aceptado

## Contexto
Las credenciales de NVRs y cámaras se almacenan cifradas (AES-256-GCM). Cualquier técnico autenticado puede solicitar revelarlas. Si un técnico deja su sesión abierta, otra persona podría ver las contraseñas sin obstáculo alguno.

## Decisión
Antes de mostrar una credencial descifrada, el frontend abre un diálogo que solicita la contraseña del sistema del técnico activo. Se llama a `POST /auth/verify-password` (requiere JWT válido) que verifica la contraseña contra el hash en DB. Solo si la respuesta es 200 se procede a obtener y mostrar la credencial.

## Consecuencias
**Ventajas:**
- Evita que sesiones desatendidas expongan contraseñas de dispositivos.
- Consistent con el flujo que usan los gestores de contraseñas del sistema operativo/browser.
- Sin estado servidor adicional: la verificación es stateless.

**Compromisos:**
- El endpoint `POST /auth/verify-password` podría usarse para fuerza bruta si un atacante tiene un JWT. Mitigado porque el lockout de login ya protege contra compromisos de JWT largos; y porque un atacante con JWT ya podría hacer daño mayor.
- Se aplica igual patrón en futuros módulos (equipos, radioenlaces, etc.) sin cambios al backend.
