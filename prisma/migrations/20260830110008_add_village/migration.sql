CREATE TABLE "Village" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Village_name_key" ON "Village"("name");

INSERT INTO "Village" ("id", "name") VALUES
    ('vlg_taguilalet', 'التاكلالت'),
    ('vlg_ivejar', 'أفجار');

ALTER TABLE "Member" ADD COLUMN "village" TEXT NOT NULL DEFAULT 'التاكلالت';

ALTER TABLE "Member" ALTER COLUMN "age" DROP NOT NULL;

UPDATE "Member" SET "village" = "age", "age" = NULL
WHERE "age" IN (SELECT "name" FROM "Village" WHERE "name" <> 'التاكلالت');

DELETE FROM "AgeGroup" WHERE "name" IN (SELECT "name" FROM "Village" WHERE "name" <> 'التاكلالت');
