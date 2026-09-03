CREATE TABLE "ExpenseAllocation" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "activityId" TEXT,
    "competitionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExpenseAllocation_expenseId_idx" ON "ExpenseAllocation"("expenseId");

CREATE INDEX "ExpenseAllocation_activityId_idx" ON "ExpenseAllocation"("activityId");

CREATE INDEX "ExpenseAllocation_competitionId_idx" ON "ExpenseAllocation"("competitionId");

ALTER TABLE "ExpenseAllocation"
  ADD CONSTRAINT "ExpenseAllocation_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpenseAllocation"
  ADD CONSTRAINT "ExpenseAllocation_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExpenseAllocation"
  ADD CONSTRAINT "ExpenseAllocation_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ExpenseAllocation" ("id", "expenseId", "amount", "activityId", "competitionId", "createdAt")
SELECT
  gen_random_uuid()::TEXT,
  "id",
  "amount",
  "activityId",
  CASE WHEN "activityId" IS NULL THEN "competitionId" ELSE NULL END,
  "createdAt"
FROM "Expense";
