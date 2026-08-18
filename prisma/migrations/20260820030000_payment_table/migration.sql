CREATE TYPE "PaymentPurpose" AS ENUM ('MEMBERSHIP', 'DONATION', 'ACTIVITY');

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "purpose" "PaymentPurpose" NOT NULL,
  "amount" INTEGER NOT NULL,
  "feeApplied" INTEGER,
  "year" INTEGER,
  "method" TEXT,
  "proof" TEXT,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "anonymous" BOOLEAN NOT NULL DEFAULT false,
  "donorName" TEXT,
  "memberId" TEXT,
  "activityId" TEXT,
  "recordedBy" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_memberId_year_purpose_idx" ON "Payment"("memberId", "year", "purpose");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_activityId_idx" ON "Payment"("activityId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Payment" (
  "id", "purpose", "amount", "feeApplied", "year", "method", "proof",
  "status", "anonymous", "donorName", "memberId", "recordedBy", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::TEXT,
  'MEMBERSHIP',
  COALESCE(ms."paidAmount", 0) + COALESCE(d."amount", 0),
  COALESCE((SELECT "membershipFee" FROM "AppSettings" LIMIT 1), 100),
  ms."year",
  ms."paymentMethod",
  ms."paymentProof",
  m."status",
  COALESCE(m."surplusAnonymous", false),
  CASE WHEN COALESCE(m."surplusAnonymous", false) THEN NULL ELSE m."fullName" END,
  ms."memberId",
  ms."recordedBy",
  ms."createdAt",
  now()
FROM "Membership" ms
JOIN "Member" m ON m."id" = ms."memberId"
LEFT JOIN "Donation" d
  ON d."memberId" = ms."memberId"
 AND d."source" = 'MEMBERSHIP'
 AND d."membershipYear" = ms."year"
WHERE COALESCE(ms."paidAmount", 0) + COALESCE(d."amount", 0) > 0;

INSERT INTO "Payment" (
  "id", "purpose", "amount", "feeApplied", "year", "method", "proof",
  "status", "anonymous", "donorName", "memberId", "activityId", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::TEXT,
  CASE WHEN d."activityId" IS NOT NULL THEN 'ACTIVITY'::"PaymentPurpose" ELSE 'DONATION'::"PaymentPurpose" END,
  d."amount",
  NULL,
  NULL,
  d."paymentMethod",
  d."proof",
  d."status",
  (d."donorName" IS NULL),
  d."donorName",
  d."memberId",
  d."activityId",
  d."createdAt",
  now()
FROM "Donation" d
WHERE d."source" <> 'MEMBERSHIP' AND d."amount" IS NOT NULL;
