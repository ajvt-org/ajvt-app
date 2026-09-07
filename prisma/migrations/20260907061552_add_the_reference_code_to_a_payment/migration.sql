ALTER TABLE "Payment" ADD COLUMN "referenceCode" TEXT;

CREATE UNIQUE INDEX "Payment_referenceCode_key" ON "Payment"("referenceCode");
