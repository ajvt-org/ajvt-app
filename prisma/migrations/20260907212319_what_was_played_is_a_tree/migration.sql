DROP TABLE "MatchAdjustment";
DROP TABLE "MatchPart";

CREATE TABLE "MatchUnit" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "parentId" TEXT,
  "levelId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "abandoned" BOOLEAN NOT NULL DEFAULT false,
  "outcome" "PartOutcome",
  "sideAPoints" INTEGER,
  "sideBPoints" INTEGER,
  "sideAColour" "PartColour",
  "worth" INTEGER,
  "sideALostCredit" BOOLEAN NOT NULL DEFAULT false,
  "sideBLostCredit" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MatchUnit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchUnit_matchId_idx" ON "MatchUnit"("matchId");
CREATE INDEX "MatchUnit_parentId_idx" ON "MatchUnit"("parentId");
CREATE INDEX "MatchUnit_levelId_idx" ON "MatchUnit"("levelId");
CREATE UNIQUE INDEX "MatchUnit_matchId_parentId_order_key" ON "MatchUnit"("matchId", "parentId", "order");

ALTER TABLE "MatchUnit"
  ADD CONSTRAINT "MatchUnit_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MatchUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MatchUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MatchUnit_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "MatchLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MatchAdjustment" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "side" "MatchSide" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MatchAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchAdjustment_matchId_idx" ON "MatchAdjustment"("matchId");
CREATE INDEX "MatchAdjustment_unitId_idx" ON "MatchAdjustment"("unitId");
CREATE INDEX "MatchAdjustment_ruleId_idx" ON "MatchAdjustment"("ruleId");

ALTER TABLE "MatchAdjustment"
  ADD CONSTRAINT "MatchAdjustment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MatchAdjustment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "MatchUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MatchAdjustment_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AdjustmentRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
