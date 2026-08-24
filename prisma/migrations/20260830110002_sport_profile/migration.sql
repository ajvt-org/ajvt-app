-- CreateEnum
CREATE TYPE "SportProfile" AS ENUM ('FOOTBALL', 'BOARD');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "profile" "SportProfile" NOT NULL DEFAULT 'FOOTBALL';
