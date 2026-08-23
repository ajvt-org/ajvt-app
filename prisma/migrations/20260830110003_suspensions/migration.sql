-- CreateEnum
CREATE TYPE "SuspensionReason" AS ENUM ('RED_CARD', 'YELLOW_CARDS', 'CONDUCT');
CREATE TYPE "SuspensionScope" AS ENUM ('MATCHES', 'DAYS', 'INDEFINITE');
CREATE TYPE "SuspensionStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'LIFTED');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN "yellowsForBan" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Activity" ADD COLUMN "redBanMatches" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Suspension" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "reason" "SuspensionReason" NOT NULL,
    "scope" "SuspensionScope" NOT NULL,
    "matches" INTEGER,
    "until" TIMESTAMP(3),
    "note" TEXT,
    "status" "SuspensionStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdBy" TEXT NOT NULL,
    "decidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suspension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Suspension_activityId_memberId_idx" ON "Suspension"("activityId", "memberId");
CREATE INDEX "Suspension_activityId_status_idx" ON "Suspension"("activityId", "status");

-- AddForeignKey
ALTER TABLE "Suspension" ADD CONSTRAINT "Suspension_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Suspension" ADD CONSTRAINT "Suspension_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
