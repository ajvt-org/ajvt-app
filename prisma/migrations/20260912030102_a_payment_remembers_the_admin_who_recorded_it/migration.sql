ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "recordedByAdminId" TEXT;

UPDATE "Payment" p
SET "recordedByAdminId" = a.id
FROM "Admin" a
WHERE a.username = p."recordedBy"
  AND p.purpose = 'MEMBERSHIP'
  AND p."recordedBy" IS NOT NULL
  AND p."recordedByAdminId" IS NULL;
