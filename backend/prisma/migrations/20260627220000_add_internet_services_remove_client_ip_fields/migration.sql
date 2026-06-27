-- DropColumn
ALTER TABLE "Client" DROP COLUMN IF EXISTS "dynamicIp";
ALTER TABLE "Client" DROP COLUMN IF EXISTS "isp";
ALTER TABLE "Client" DROP COLUMN IF EXISTS "networkRange";
ALTER TABLE "Client" DROP COLUMN IF EXISTS "publicIp";

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientInternetService" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'WAN',
    "ip" TEXT,
    "dynamicIp" BOOLEAN NOT NULL DEFAULT false,
    "isp" TEXT,
    "serviceNumber" TEXT,
    "phone" TEXT,
    "titular" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInternetService_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientInternetService" ADD CONSTRAINT "ClientInternetService_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
