-- AlterTable: campos de bloqueo de cuenta para Technician
ALTER TABLE "Technician" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Technician" ADD COLUMN "lockedUntil" TIMESTAMP(3);
