-- Read-only. The other kind of duplicate: not two memberships on one account,
-- which the unique index now stops, but the same person coming back on a
-- second phone number, which it does not.

-- 1. Everything an admin refused as a duplicate, and whether a membership
--    under the same name exists elsewhere.
SELECT
  m.id,
  m."fullName",
  m.status,
  m."rejectionReason",
  u.phone                                   AS account,
  m."createdAt"::date                       AS created,
  (SELECT count(*) FROM "Member" o
     WHERE o."fullName" = m."fullName" AND o.id <> m.id) AS others_with_this_name
FROM "Member" m
LEFT JOIN "User" u ON u.id = m."userId"
WHERE m."rejectionReason" = 'طلب مكرر'
ORDER BY m."createdAt";

-- 2. Names carried by more than one membership, whatever the status, with the
--    accounts behind them. A family sharing a name shows up here too, so read
--    the first names, not just the count.
SELECT
  m."fullName",
  count(*)                                        AS memberships,
  count(DISTINCT m."userId")                      AS accounts,
  string_agg(DISTINCT u.phone, ', ')              AS numbers,
  string_agg(m.status::text, ', ' ORDER BY m."createdAt") AS statuses
FROM "Member" m
LEFT JOIN "User" u ON u.id = m."userId"
GROUP BY m."fullName"
HAVING count(*) > 1
ORDER BY count(*) DESC, m."fullName";

-- 3. The same, but by payment proof: one screenshot behind two memberships is
--    the same person twice however the name was spelled. Needs the
--    fingerprints from `npm run db:proof-hashes` to have been backfilled.
SELECT
  p.sha256,
  count(*)                             AS memberships,
  string_agg(m."fullName", ' | ')      AS names,
  string_agg(m.status::text, ', ')     AS statuses
FROM "Member" m
JOIN "ProofImage" p ON p.filename = m."paymentProof"
GROUP BY p.sha256
HAVING count(*) > 1
ORDER BY count(*) DESC;
