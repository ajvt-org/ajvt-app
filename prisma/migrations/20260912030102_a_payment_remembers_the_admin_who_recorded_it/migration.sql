ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "recordedByAdminId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_recordedByAdminId_fkey'
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_recordedByAdminId_fkey"
      FOREIGN KEY ("recordedByAdminId") REFERENCES "Admin"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

UPDATE "Payment" p
SET "recordedByAdminId" = a.id
FROM "Admin" a
WHERE a.username = p."recordedBy"
  AND p.purpose = 'MEMBERSHIP'
  AND p."recordedBy" IS NOT NULL
  AND p."recordedByAdminId" IS NULL;
