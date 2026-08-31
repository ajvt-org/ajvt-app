-- A membership is known by its account now. The trail and the archive were
-- written against the member row, so they are repointed while the mapping
-- still exists, which keeps the history a member's page shows.
UPDATE "AuditLog" a
SET "targetId" = m."userId"
FROM "Member" m
WHERE a."targetType" = 'Member' AND a."targetId" = m.id;

-- An archive of a member an admin added without an account carries the key
-- with nothing in it, so the account has to be read out and checked rather
-- than the key looked for.
UPDATE "DeletedRecord" d
SET "recordId" = d.data ->> 'userId'
WHERE d.kind = 'Member'
  AND d.data ->> 'userId' IS NOT NULL
  AND d."recordId" IS DISTINCT FROM d.data ->> 'userId';
