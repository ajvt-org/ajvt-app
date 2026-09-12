ALTER TABLE "Payment" ADD COLUMN "source" TEXT;

UPDATE "Payment" p
SET "source" = d."source"
FROM "Donation" d
WHERE d."id" = p."id"
  AND p."purpose" IN ('DONATION', 'ACTIVITY')
  AND d."source" <> 'MEMBERSHIP';
