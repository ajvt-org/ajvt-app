UPDATE "Activity"
SET "matchShape" = 'SERIES', "minTeamSize" = 1, "maxTeamSize" = 1
WHERE "isTournament" = TRUE
  AND "title" = 'بطولة الشطرنج'
  AND "matchShape" = 'FOOTBALL'
  AND NOT EXISTS (SELECT 1 FROM "Match" m WHERE m."activityId" = "Activity"."id");

UPDATE "Activity"
SET "matchShape" = 'SERIES'
WHERE "isTournament" = TRUE
  AND "title" = 'بطولة البلاي ستيشن'
  AND "matchShape" = 'FOOTBALL'
  AND NOT EXISTS (SELECT 1 FROM "Match" m WHERE m."activityId" = "Activity"."id");

WITH seatless AS (
  SELECT a."id" AS "activityId", r."userId", COALESCE(u."fullName", '') AS "name"
  FROM "ActivityRegistration" r
  JOIN "Activity" a ON a."id" = r."activityId"
  JOIN "User" u ON u."id" = r."userId"
  WHERE a."isTournament" = TRUE
    AND a."matchShape" = 'SERIES'
    AND a."minTeamSize" = 1
    AND a."maxTeamSize" = 1
    AND r."status" = 'ACTIVE'
    AND NOT EXISTS (
      SELECT 1 FROM "TeamMember" tm
      JOIN "Team" t ON t."id" = tm."teamId"
      WHERE t."activityId" = a."id" AND tm."userId" = r."userId"
    )
)
INSERT INTO "Team" ("id", "activityId", "name", "autoNamed")
SELECT 'c' || SUBSTR(MD5(s."activityId" || s."userId"), 1, 24), s."activityId", s."name", TRUE
FROM seatless s;

WITH seatless AS (
  SELECT a."id" AS "activityId", r."userId"
  FROM "ActivityRegistration" r
  JOIN "Activity" a ON a."id" = r."activityId"
  WHERE a."isTournament" = TRUE
    AND a."matchShape" = 'SERIES'
    AND a."minTeamSize" = 1
    AND a."maxTeamSize" = 1
    AND r."status" = 'ACTIVE'
    AND NOT EXISTS (
      SELECT 1 FROM "TeamMember" tm
      JOIN "Team" t ON t."id" = tm."teamId"
      WHERE t."activityId" = a."id" AND tm."userId" = r."userId"
    )
)
INSERT INTO "TeamMember" ("id", "teamId", "userId", "status")
SELECT 'm' || SUBSTR(MD5(s."activityId" || s."userId"), 1, 24),
       'c' || SUBSTR(MD5(s."activityId" || s."userId"), 1, 24),
       s."userId",
       'ACTIVE'
FROM seatless s
WHERE EXISTS (
  SELECT 1 FROM "Team" t WHERE t."id" = 'c' || SUBSTR(MD5(s."activityId" || s."userId"), 1, 24)
);
