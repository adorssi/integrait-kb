ALTER TABLE "Technician" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Technician" ADD COLUMN "totpSecret" TEXT;
