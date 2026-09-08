ALTER TABLE "Payment" ADD COLUMN "paidOn" TIMESTAMP(3);

CREATE INDEX "Payment_paidOn_idx" ON "Payment"("paidOn");
