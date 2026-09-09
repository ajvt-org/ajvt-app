UPDATE "Match" m
SET "dayId" = t.id
FROM "Activity" a, "TournamentDay" t
WHERE m."activityId" = a.id
  AND t."activityId" = a.id
  AND m."dayId" IS NOT NULL
  AND m."matchDate" IS NOT NULL
  AND a."startsAt" IS NOT NULL
  AND t."isRest" = false
  AND t.position =
        ((m."matchDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nouakchott')::date
       - (a."startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nouakchott')::date) + 1
  AND m."dayId" <> t.id;
