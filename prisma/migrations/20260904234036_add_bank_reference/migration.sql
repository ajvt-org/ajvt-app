ALTER TABLE "Payment" ADD COLUMN "bankReference" TEXT;

ALTER TABLE "Membership" ADD COLUMN "bankReference" TEXT;

ALTER TABLE "Donation" ADD COLUMN "bankReference" TEXT;

CREATE INDEX "Payment_bankReference_idx" ON "Payment"("bankReference");

CREATE INDEX "Membership_bankReference_idx" ON "Membership"("bankReference");

CREATE INDEX "Donation_bankReference_idx" ON "Donation"("bankReference");
