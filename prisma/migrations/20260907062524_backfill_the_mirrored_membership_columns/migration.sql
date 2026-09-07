UPDATE "Payment" p
SET "referenceCode" = m."referenceCode",
    "reviewedBy"    = m."reviewedBy",
    "reviewedAt"    = m."reviewedAt"
FROM "Membership" m
WHERE p.purpose = 'MEMBERSHIP'
  AND p."userId" = m."userId"
  AND p.year = m.year
  AND (
    p."referenceCode" IS DISTINCT FROM m."referenceCode"
    OR p."reviewedBy" IS DISTINCT FROM m."reviewedBy"
    OR p."reviewedAt" IS DISTINCT FROM m."reviewedAt"
  );
