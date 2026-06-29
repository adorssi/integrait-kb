-- Campos de la sección Details del email de Veeam
ALTER TABLE "BackupJob" ADD COLUMN "startTime"       TEXT;
ALTER TABLE "BackupJob" ADD COLUMN "endTime"         TEXT;
ALTER TABLE "BackupJob" ADD COLUMN "dataSize"        TEXT;
ALTER TABLE "BackupJob" ADD COLUMN "dataRead"        TEXT;
ALTER TABLE "BackupJob" ADD COLUMN "dataTransferred" TEXT;
ALTER TABLE "BackupJob" ADD COLUMN "duration"        TEXT;
