-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "tempPasswordHours" INTEGER NOT NULL DEFAULT 24;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tempPasswordExpiresAt" TIMESTAMP(3);
