-- Equipment: notas y credenciales cifradas
ALTER TABLE "Equipment" ADD COLUMN "notes"             TEXT;
ALTER TABLE "Equipment" ADD COLUMN "encryptedUsername" TEXT;
ALTER TABLE "Equipment" ADD COLUMN "encryptedPassword" TEXT;

-- Client: flags para habilitar módulos opcionales (deshabilitados por defecto)
ALTER TABLE "Client" ADD COLUMN "hasBranches" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN "hasCameras"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN "hasBackups"  BOOLEAN NOT NULL DEFAULT false;
