CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memberFacing" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentMethod" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE UNIQUE INDEX "PaymentMethod_name_key" ON "PaymentMethod"("name");

CREATE INDEX "PaymentMethod_active_position_idx" ON "PaymentMethod"("active", "position");

INSERT INTO "PaymentMethod" ("id", "name", "memberFacing", "active", "position", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::TEXT, 'بنكيلي', true, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'السداد', true, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'مصرفي', true, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'نقداً', false, true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
