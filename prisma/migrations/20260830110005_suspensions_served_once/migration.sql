ALTER TABLE "Match" ADD COLUMN "suspensionsServedAt" TIMESTAMP(3);

UPDATE "Match" SET "suspensionsServedAt" = "updatedAt" WHERE "status" = 'PLAYED';
