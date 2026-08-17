CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "paidAmount" INTEGER,
  "paymentMethod" TEXT,
  "paymentProof" TEXT,
  "recordedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Membership_memberId_year_key" ON "Membership"("memberId", "year");

CREATE INDEX "Membership_year_idx" ON "Membership"("year");

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Membership" ("id", "memberId", "year", "paidAmount", "paymentMethod", "paymentProof", "createdAt")
SELECT
  gen_random_uuid()::TEXT,
  "id",
  "membershipYear",
  "paidAmount",
  "paymentMethod",
  "paymentProof",
  "createdAt"
FROM "Member";
