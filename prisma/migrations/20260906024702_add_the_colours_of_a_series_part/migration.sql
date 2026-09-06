CREATE TYPE "PartColour" AS ENUM ('FIRST', 'SECOND');

ALTER TABLE "Activity" ADD COLUMN "hasColours" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Activity" ADD COLUMN "firstColourWord" TEXT;
ALTER TABLE "Activity" ADD COLUMN "secondColourWord" TEXT;

ALTER TABLE "Match" ADD COLUMN "sideAOpensAs" "PartColour";

ALTER TABLE "MatchPart" ADD COLUMN "sideAColour" "PartColour";
