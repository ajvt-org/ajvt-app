ALTER TABLE "Activity"
  DROP COLUMN "partsPerMatch",
  DROP COLUMN "matchEnding",
  DROP COLUMN "partsToWin",
  DROP COLUMN "partDecision",
  DROP COLUMN "partTarget",
  DROP COLUMN "partWord",
  DROP COLUMN "partsWord";

DROP TYPE "MatchEnding";
DROP TYPE "PartDecision";

CREATE TYPE "MatchEnding" AS ENUM ('PLAY_ALL', 'FIRST_TO', 'FIRST_PAST');
CREATE TYPE "PartDecision" AS ENUM ('OUTCOME', 'SCORE');
CREATE TYPE "BothPastTarget" AS ENUM ('HIGHER_TOTAL', 'PLAY_ON');

CREATE TABLE "MatchLevel" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "singular" TEXT NOT NULL,
  "plural" TEXT NOT NULL,
  "ending" "MatchEnding",
  "unitsPerParent" INTEGER,
  "unitsToWin" INTEGER,
  "target" INTEGER,
  "deciderTarget" INTEGER,
  "bothPastTarget" "BothPastTarget",
  "extendsWhenLevel" BOOLEAN NOT NULL DEFAULT false,
  "extensionUnits" INTEGER NOT NULL DEFAULT 0,
  "startingCredit" INTEGER NOT NULL DEFAULT 0,
  "creditWindow" INTEGER NOT NULL DEFAULT 0,
  "halvesPerUnit" INTEGER NOT NULL DEFAULT 2,
  "decision" "PartDecision",
  "wonUnitWorth" INTEGER NOT NULL DEFAULT 1,
  "doubledWorth" INTEGER NOT NULL DEFAULT 1,
  "doublesOnBlankOpponent" BOOLEAN NOT NULL DEFAULT false,
  "doublesOnRecoveredCredit" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MatchLevel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchLevel_activityId_idx" ON "MatchLevel"("activityId");
CREATE UNIQUE INDEX "MatchLevel_activityId_order_key" ON "MatchLevel"("activityId", "order");

ALTER TABLE "MatchLevel"
  ADD CONSTRAINT "MatchLevel_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdjustmentRule" RENAME COLUMN "partsToSelf" TO "unitsToSelf";
ALTER TABLE "AdjustmentRule" RENAME COLUMN "partsFromOther" TO "unitsFromOther";

ALTER TABLE "AdjustmentRule"
  ADD COLUMN "levelId" TEXT,
  ADD COLUMN "endsUnit" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "AdjustmentRule_levelId_idx" ON "AdjustmentRule"("levelId");

ALTER TABLE "AdjustmentRule"
  ADD CONSTRAINT "AdjustmentRule_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "MatchLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
