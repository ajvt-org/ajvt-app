CREATE TYPE "TournamentFormat" AS ENUM ('KNOCKOUT', 'GROUPS_THEN_KNOCKOUT');

ALTER TABLE "Activity" ADD COLUMN "format" "TournamentFormat";

UPDATE "Activity" a
SET "format" = CASE
  WHEN EXISTS (SELECT 1 FROM "Group" g WHERE g."activityId" = a."id") THEN 'GROUPS_THEN_KNOCKOUT'::"TournamentFormat"
  ELSE 'KNOCKOUT'::"TournamentFormat"
END
WHERE a."isTournament" = true;
