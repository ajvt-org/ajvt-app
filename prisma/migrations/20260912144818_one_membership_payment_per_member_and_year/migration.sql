DROP INDEX IF EXISTS "Payment_userId_year_purpose_idx";

CREATE UNIQUE INDEX "Payment_userId_year_purpose_key" ON "Payment"("userId", "year", "purpose");
