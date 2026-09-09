ALTER TABLE "WorthRule" ADD COLUMN "situations" "WorthWhen"[] NOT NULL DEFAULT ARRAY[]::"WorthWhen"[];

UPDATE "WorthRule" SET "situations" = ARRAY["when"];

ALTER TABLE "WorthRule" DROP COLUMN "when";

ALTER TABLE "WorthRule" RENAME COLUMN "situations" TO "when";

ALTER TABLE "WorthRule" ALTER COLUMN "when" DROP DEFAULT;
