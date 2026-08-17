ALTER TABLE "Expense" ADD COLUMN "activityId" TEXT;
ALTER TABLE "Donation" ADD COLUMN "activityId" TEXT;

CREATE INDEX "Expense_activityId_idx" ON "Expense"("activityId");
CREATE INDEX "Donation_activityId_idx" ON "Donation"("activityId");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
