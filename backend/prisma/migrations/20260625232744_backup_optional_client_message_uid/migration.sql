/*
  Warnings:

  - A unique constraint covering the columns `[messageUid]` on the table `BackupJob` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "BackupJob" DROP CONSTRAINT "BackupJob_clientId_fkey";

-- AlterTable
ALTER TABLE "BackupJob" ADD COLUMN     "messageUid" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BackupJob_messageUid_key" ON "BackupJob"("messageUid");

-- AddForeignKey
ALTER TABLE "BackupJob" ADD CONSTRAINT "BackupJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
