# ADR-008: Integración Gmail para Backups vía IMAP
**Fecha:** 2026-06-25
**Estado:** Aceptado

## Contexto
Se necesita leer automáticamente los emails de resultado de backup que Veeam envía a un buzón de Gmail dedicado y asociarlos a cada cliente en el sistema.

Asunto de ejemplo:
- `ESTUDIO BERTANI - [Success] VMs a Disco Externo (2 objects)` → cliente: ESTUDIO BERTANI
- `SUPPORT EXPIRED ZNP - [Success] 02-ZNP_SCA_HR` → cliente: ZNP

## Decisiones

### 1. Protocolo: IMAP con `imapflow` + App Password (no Gmail API OAuth2)
La cuenta de Gmail es exclusivamente para backups. Usar IMAP con App Password es más simple que el flujo OAuth2 de la Gmail API, sin pérdida de funcionalidad para este caso. El usuario genera un App Password de 16 caracteres en su cuenta Google y lo configura en `.env`.

### 2. Parsing del asunto
Función pura testeable independiente del transporte:
1. Eliminar prefijo `SUPPORT EXPIRED ` si existe
2. Dividir en el primer ` - ` (espacio-guion-espacio)
3. Lado izquierdo → nombre del cliente
4. Lado derecho → `[Result] NombreTarea`
5. Mapeo: `[Success]→SUCCESS`, `[Warning]→WARNING`, `[Failed]→FAILURE`

### 3. Match de cliente
Match case-insensitive del nombre parseado contra `Client.name`. Si no hay match exacto, se intenta match parcial (contains). Jobs sin match se almacenan con `clientId = null` y se reportan en la respuesta del sync.

### 4. Deduplicación
Se agrega `messageUid String? @unique` a `BackupJob`. El UID IMAP del mensaje identifica unívocamente cada email. Si ya existe un job con ese UID, se omite.

### 5. Scheduler
`node-cron` con cron expression configurable via `GMAIL_SYNC_CRON` en `.env`. Default: `0 */4 * * *` (cada 4 horas). Además un endpoint `POST /backups/sync` para sincronización manual (solo ADMIN).

### 6. Schema: clientId opcional
`BackupJob.clientId` pasa a `String?` para no perder emails de clientes aún no dados de alta en el sistema. Estos aparecen en el reporte de sync como "sin match".

## Consecuencias
**Ganado:** Setup en 2 minutos (solo App Password), sin proyecto en Google Cloud, parsing determinístico.
**Sacrificado:** Si Google desactiva App Passwords en el futuro, habría que migrar a OAuth2. El match por nombre puede fallar si los nombres difieren entre Veeam y el sistema.
