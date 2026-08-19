UPDATE "Payment" p
SET "recordedBy" = ms."recordedBy"
FROM "Membership" ms
WHERE ms."memberId" = p."memberId"
  AND ms.year = p.year
  AND p.purpose = 'MEMBERSHIP'
  AND p."recordedBy" IS NULL
  AND ms."recordedBy" IS NOT NULL;
