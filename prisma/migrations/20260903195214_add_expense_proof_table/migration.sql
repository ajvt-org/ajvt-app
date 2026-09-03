CREATE TABLE "ExpenseProof" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseProof_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpenseProof_expenseId_filename_key" ON "ExpenseProof"("expenseId", "filename");

CREATE INDEX "ExpenseProof_expenseId_idx" ON "ExpenseProof"("expenseId");

CREATE INDEX "ExpenseProof_filename_idx" ON "ExpenseProof"("filename");

ALTER TABLE "ExpenseProof"
  ADD CONSTRAINT "ExpenseProof_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ExpenseProof" ("id", "expenseId", "filename", "createdAt")
SELECT gen_random_uuid()::TEXT, "id", "proof", "createdAt"
FROM "Expense"
WHERE "proof" IS NOT NULL AND btrim("proof") <> '';
