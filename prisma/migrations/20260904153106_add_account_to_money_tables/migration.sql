ALTER TABLE "Payment" ADD COLUMN "accountId" TEXT;

ALTER TABLE "Membership" ADD COLUMN "accountId" TEXT;

ALTER TABLE "Donation" ADD COLUMN "accountId" TEXT;

ALTER TABLE "Expense" ADD COLUMN "accountId" TEXT;

CREATE INDEX "Payment_accountId_idx" ON "Payment"("accountId");

CREATE INDEX "Membership_accountId_idx" ON "Membership"("accountId");

CREATE INDEX "Donation_accountId_idx" ON "Donation"("accountId");

CREATE INDEX "Expense_accountId_idx" ON "Expense"("accountId");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "PaymentAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "PaymentAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Donation"
  ADD CONSTRAINT "Donation_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "PaymentAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "PaymentAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
