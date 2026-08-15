ALTER TABLE "AppSettings" ALTER COLUMN "tempPasswordHours" SET DEFAULT 1;

UPDATE "AppSettings" SET "tempPasswordHours" = 1 WHERE "tempPasswordHours" = 24;
