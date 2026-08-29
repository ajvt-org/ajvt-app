ALTER TABLE "Donation" ADD COLUMN "anonymous" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Donation" SET "anonymous" = true WHERE "donorName" IS NULL;
