-- Read-only. What the release would do to the production data, before it does
-- it. Nothing here writes; run each block on its own.
--
-- The ranking is the same one the migration uses: approved beats pending beats
-- rejected, then whichever carries records, then the most recent.

-- 1. The overall picture ------------------------------------------------------
SELECT
  (SELECT count(*) FROM "User")                                    AS accounts,
  (SELECT count(*) FROM "Member")                                  AS memberships,
  (SELECT count(*) FROM "Member" WHERE "userId" IS NULL)           AS memberships_with_no_account,
  (SELECT count(*) FROM "User" u
     WHERE NOT EXISTS (SELECT 1 FROM "Member" m WHERE m."userId" = u.id)) AS accounts_with_no_membership,
  (SELECT count(*) FROM (
     SELECT "userId" FROM "Member" WHERE "userId" IS NOT NULL
     GROUP BY "userId" HAVING count(*) > 1) d)                     AS accounts_holding_several;

-- 2. Every membership on an account that holds more than one, and what would
--    happen to it. Read this one before releasing.
WITH carrying AS (
  SELECT
    m.id, m."userId", m."fullName", m.status, m."createdAt", m."memberNumber",
    (
      m."memberNumber" IS NOT NULL
      OR EXISTS (SELECT 1 FROM "ActivityRegistration" r WHERE r."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "TeamMember" t WHERE t."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "Donation" d WHERE d."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "MatchGoal" g WHERE g."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "MatchBooking" b WHERE b."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "MvpCandidate" c WHERE c."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "Match" x WHERE x."manOfTheMatchId" = m.id)
    ) AS carries
  FROM "Member" m
  WHERE m."userId" IS NOT NULL
),
ranked AS (
  SELECT c.*,
    ROW_NUMBER() OVER (
      PARTITION BY c."userId"
      ORDER BY
        CASE c.status WHEN 'ACTIVE' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
        c.carries DESC,
        c."createdAt" DESC
    ) AS rn,
    count(*) OVER (PARTITION BY c."userId") AS on_this_account
  FROM carrying c
)
SELECT
  u.phone            AS account,
  r."fullName",
  r.status,
  r."memberNumber",
  r."createdAt"::date AS created,
  r.carries          AS carries_records,
  CASE WHEN r.rn = 1 THEN 'KEEP'
       WHEN r.carries THEN 'DETACH'
       ELSE 'DELETE' END AS action
FROM ranked r
JOIN "User" u ON u.id = r."userId"
WHERE r.on_this_account > 1
ORDER BY u.phone, r.rn;

-- 3. The totals from that same rule, in one line.
WITH carrying AS (
  SELECT
    m.id, m."userId", m.status, m."createdAt",
    (
      m."memberNumber" IS NOT NULL
      OR EXISTS (SELECT 1 FROM "ActivityRegistration" r WHERE r."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "TeamMember" t WHERE t."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "Donation" d WHERE d."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "MatchGoal" g WHERE g."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "MatchBooking" b WHERE b."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "MvpCandidate" c WHERE c."memberId" = m.id)
      OR EXISTS (SELECT 1 FROM "Match" x WHERE x."manOfTheMatchId" = m.id)
    ) AS carries
  FROM "Member" m
  WHERE m."userId" IS NOT NULL
),
ranked AS (
  SELECT c.*,
    ROW_NUMBER() OVER (
      PARTITION BY c."userId"
      ORDER BY
        CASE c.status WHEN 'ACTIVE' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
        c.carries DESC,
        c."createdAt" DESC
    ) AS rn
  FROM carrying c
)
SELECT
  count(*) FILTER (WHERE rn > 1 AND NOT carries) AS would_be_deleted,
  count(*) FILTER (WHERE rn > 1 AND carries)     AS would_be_detached,
  0                                              AS accounts_deleted
FROM ranked;

-- 4. The phone column, for the release after this one. Anything but a zero in
--    the last two columns is something to write down before it is dropped.
SELECT
  count(*) FILTER (WHERE u.phone IS NOT NULL AND m.phone = u.phone)                  AS same_as_account,
  count(*) FILTER (WHERE u.phone IS NOT NULL AND m.phone IS NOT NULL AND m.phone <> u.phone) AS differs_from_account,
  count(*) FILTER (WHERE u.phone IS NULL AND m.phone IS NOT NULL)                    AS number_but_no_account,
  count(*) FILTER (WHERE u.phone IS NULL AND m.phone IS NULL)                        AS neither
FROM "Member" m
LEFT JOIN "User" u ON u.id = m."userId";

-- 5. The rows behind column 2 and 3 of the previous query, if either is not 0.
SELECT m.id, m."fullName", m.status, m.phone AS member_phone, u.phone AS account_phone
FROM "Member" m
LEFT JOIN "User" u ON u.id = m."userId"
WHERE (u.phone IS NOT NULL AND m.phone IS NOT NULL AND m.phone <> u.phone)
   OR (u.phone IS NULL AND m.phone IS NOT NULL)
ORDER BY m."createdAt";
