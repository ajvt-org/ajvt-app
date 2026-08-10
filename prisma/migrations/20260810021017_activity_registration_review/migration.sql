/*
  Warnings:

  - Added the required column `updatedAt` to the `ActivityRegistration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ActivityRegistration" ADD COLUMN     "paymentProof" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing registrations were created back when there was no review step
-- (registering = confirmed on the spot) — treat them as already approved
-- instead of dropping them into the new pending-review queue.
UPDATE "ActivityRegistration" SET "status" = 'ACTIVE';
