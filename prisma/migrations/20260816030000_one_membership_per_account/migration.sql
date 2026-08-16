-- An account holds one membership. Accounts created before this rule may hold
-- several, and the index cannot be created while they do, so they are settled
-- first by the same rule as prisma/dedupeMembers.ts: approved beats pending
-- beats rejected, then whichever carries records, then the most recent.
--
-- A duplicate that carries nothing is deleted. One that carries a card, a
-- registration, a team, money or a match record is detached instead, because
-- every relation cascades on delete and removing the row would take those with
-- it. Detached is the state an admin-added member already sits in.
--
-- The ranking is spelled out twice rather than shared: the delete changes what
-- the second ranking sees, and a duplicate detached by the second statement
-- was never a candidate for the first.

WITH carrying AS (
  SELECT
    m.id,
    m."userId",
    m.status,
    m."createdAt",
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
  SELECT
    c.id,
    c.carries,
    ROW_NUMBER() OVER (
      PARTITION BY c."userId"
      ORDER BY
        CASE c.status WHEN 'ACTIVE' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
        c.carries DESC,
        c."createdAt" DESC
    ) AS rn
  FROM carrying c
)
DELETE FROM "Member"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1 AND NOT carries);

WITH carrying AS (
  SELECT
    m.id,
    m."userId",
    m.status,
    m."createdAt",
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
  SELECT
    c.id,
    ROW_NUMBER() OVER (
      PARTITION BY c."userId"
      ORDER BY
        CASE c.status WHEN 'ACTIVE' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
        c.carries DESC,
        c."createdAt" DESC
    ) AS rn
  FROM carrying c
)
UPDATE "Member"
SET "userId" = NULL
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");
