-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contractEnd" TIMESTAMP(3),
ADD COLUMN     "contractStart" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isp" TEXT,
ADD COLUMN     "networkRange" TEXT,
ADD COLUMN     "publicIp" TEXT,
ADD COLUMN     "servicePlan" TEXT;

-- CreateTable
CREATE TABLE "NVR" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER,
    "brand" TEXT,
    "model" TEXT,
    "encryptedUsername" TEXT,
    "encryptedPassword" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NVR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nvrId" TEXT,
    "name" TEXT NOT NULL,
    "ip" TEXT,
    "channel" INTEGER,
    "location" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "encryptedUsername" TEXT,
    "encryptedPassword" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NVR" ADD CONSTRAINT "NVR_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_nvrId_fkey" FOREIGN KEY ("nvrId") REFERENCES "NVR"("id") ON DELETE SET NULL ON UPDATE CASCADE;
