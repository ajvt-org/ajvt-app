INSERT INTO "ExpenseAllocation" ("id", "expenseId", "amount", "activityId", "competitionId", "createdAt")
SELECT
  gen_random_uuid()::TEXT,
  e."id",
  e."amount",
  e."activityId",
  CASE WHEN e."activityId" IS NULL THEN e."competitionId" END,
  e."createdAt"
FROM "Expense" e
WHERE NOT EXISTS (SELECT 1 FROM "ExpenseAllocation" a WHERE a."expenseId" = e."id");
