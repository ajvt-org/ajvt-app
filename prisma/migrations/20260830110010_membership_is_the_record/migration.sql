ALTER TABLE "Membership"
    ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN "rejectionReason" TEXT,
    ADD COLUMN "referenceCode" TEXT,
    ADD COLUMN "surplusAnonymous" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "reviewedBy" TEXT,
    ADD COLUMN "reviewedAt" TIMESTAMP(3),
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

INSERT INTO "Membership" (
    "id", "memberId", "year", "status", "rejectionReason", "paidAmount",
    "paymentMethod", "paymentProof", "referenceCode", "surplusAnonymous",
    "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text, m."id", m."membershipYear", m."status", m."rejectionReason",
    m."paidAmount", m."paymentMethod", m."paymentProof", m."referenceCode",
    m."surplusAnonymous", m."createdAt", m."updatedAt"
FROM "Member" m
ON CONFLICT ("memberId", "year") DO UPDATE SET
    "status" = EXCLUDED."status",
    "rejectionReason" = EXCLUDED."rejectionReason",
    "referenceCode" = EXCLUDED."referenceCode",
    "surplusAnonymous" = EXCLUDED."surplusAnonymous",
    "paymentProof" = COALESCE("Membership"."paymentProof", EXCLUDED."paymentProof"),
    "paymentMethod" = COALESCE("Membership"."paymentMethod", EXCLUDED."paymentMethod");

ALTER TABLE "Membership" ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX "Membership_referenceCode_key" ON "Membership"("referenceCode");

CREATE INDEX "Membership_status_idx" ON "Membership"("status");
