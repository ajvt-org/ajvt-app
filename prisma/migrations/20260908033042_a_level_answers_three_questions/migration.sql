DELETE FROM "MatchMove";
DELETE FROM "MoveRule";
DELETE FROM "MatchUnit";
DELETE FROM "MatchLevel";

CREATE TYPE "CountedBy" AS ENUM ('OUTCOME', 'POINTS');
CREATE TYPE "EndsBy" AS ENUM ('COUNT', 'TARGET');
CREATE TYPE "Unsettled" AS ENUM ('CONTINUE', 'DECIDER', 'DRAW');

ALTER TABLE "MatchLevel"
  DROP COLUMN "ending",
  DROP COLUMN "unitsPerParent",
  DROP COLUMN "unitsToWin",
  DROP COLUMN "bothPastTarget",
  DROP COLUMN "extendsWhenLevel",
  DROP COLUMN "extensionUnits",
  DROP COLUMN "halvesPerUnit",
  DROP COLUMN "decision",
  DROP COLUMN "wonUnitWorth",
  DROP COLUMN "doubledWorth",
  DROP COLUMN "doublesOnBlankOpponent",
  DROP COLUMN "doublesOnRecoveredCredit",
  ADD COLUMN "countedBy" "CountedBy",
  ADD COLUMN "endsBy" "EndsBy",
  ADD COLUMN "unitCount" INTEGER,
  ADD COLUMN "unsettled" "Unsettled",
  ADD COLUMN "margin" INTEGER,
  ADD COLUMN "continueUnits" INTEGER;

DROP TYPE "MatchEnding";
DROP TYPE "BothPastTarget";
DROP TYPE "PartDecision";

ALTER TABLE "MoveRule"
  ADD COLUMN "unitWorth" INTEGER,
  ALTER COLUMN "levelId" SET NOT NULL;

ALTER TABLE "MoveRule" DROP CONSTRAINT "MoveRule_levelId_fkey";
ALTER TABLE "MoveRule"
  ADD CONSTRAINT "MoveRule_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "MatchLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
