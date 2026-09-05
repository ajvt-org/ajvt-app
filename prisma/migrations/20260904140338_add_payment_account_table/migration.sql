CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "position" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentAccount_methodId_active_idx" ON "PaymentAccount"("methodId", "active");

CREATE UNIQUE INDEX "PaymentAccount_methodId_code_key" ON "PaymentAccount"("methodId", "code");

ALTER TABLE "PaymentAccount"
  ADD CONSTRAINT "PaymentAccount_methodId_fkey"
  FOREIGN KEY ("methodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
