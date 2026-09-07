ALTER TABLE "Membership" ADD COLUMN "endedAt" TIMESTAMP(3);
ALTER TABLE "Membership" ADD COLUMN "endedReason" TEXT;
ALTER TABLE "Membership" ADD COLUMN "endedBy" TEXT;
