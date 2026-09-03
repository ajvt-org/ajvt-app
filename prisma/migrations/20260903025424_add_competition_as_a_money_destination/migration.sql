ALTER TABLE "Payment" ADD COLUMN "competitionId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "competitionId" TEXT;
ALTER TABLE "Donation" ADD COLUMN "competitionId" TEXT;

CREATE INDEX "Payment_competitionId_idx" ON "Payment"("competitionId");
CREATE INDEX "Expense_competitionId_idx" ON "Expense"("competitionId");
CREATE INDEX "Donation_competitionId_idx" ON "Donation"("competitionId");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Donation"
  ADD CONSTRAINT "Donation_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
