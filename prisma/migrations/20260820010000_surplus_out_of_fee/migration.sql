UPDATE "Membership" ms
SET "paidAmount" = LEAST(ms."paidAmount", COALESCE((SELECT "membershipFee" FROM "AppSettings" LIMIT 1), 100))
WHERE ms."paidAmount" IS NOT NULL;

UPDATE "Member" m
SET "paidAmount" = LEAST(m."paidAmount", COALESCE((SELECT "membershipFee" FROM "AppSettings" LIMIT 1), 100))
WHERE m."paidAmount" IS NOT NULL;

INSERT INTO "Membership" ("id", "memberId", "year", "paidAmount", "paymentMethod", "paymentProof", "createdAt")
SELECT
  gen_random_uuid()::TEXT,
  m."id",
  m."membershipYear",
  m."paidAmount",
  m."paymentMethod",
  m."paymentProof",
  m."createdAt"
FROM "Member" m
WHERE m."status" = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM "Membership" ms
    WHERE ms."memberId" = m."id" AND ms."year" = m."membershipYear"
  );
