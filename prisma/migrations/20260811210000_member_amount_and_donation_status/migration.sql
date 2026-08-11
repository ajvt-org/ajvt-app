/*
  Warnings:
  - Added the required column `updatedAt` to the `Donation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "paidAmount" INTEGER;

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "memberId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Donation" ALTER COLUMN "proof" DROP NOT NULL;

-- Existing rows predate the status field and were always treated as live —
-- backfill them to ACTIVE, not the column default (PENDING), so they don't
-- vanish from admin/payments or silently need re-approval.
UPDATE "Donation" SET "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "Donation_memberId_idx" ON "Donation"("memberId");

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
