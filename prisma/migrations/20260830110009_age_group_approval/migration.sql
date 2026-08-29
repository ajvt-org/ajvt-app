ALTER TABLE "AgeGroup" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AgeGroup" SET "approved" = true;
