CREATE TYPE "MatchSide" AS ENUM ('SIDE_A', 'SIDE_B');

CREATE TABLE "AdjustmentRule" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "partsToSelf" INTEGER NOT NULL,
  "partsFromOther" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdjustmentRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdjustmentRule_activityId_name_key" ON "AdjustmentRule"("activityId", "name");
CREATE INDEX "AdjustmentRule_activityId_idx" ON "AdjustmentRule"("activityId");

ALTER TABLE "AdjustmentRule" ADD CONSTRAINT "AdjustmentRule_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MatchAdjustment" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "side" "MatchSide" NOT NULL,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MatchAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchAdjustment_matchId_idx" ON "MatchAdjustment"("matchId");
CREATE INDEX "MatchAdjustment_ruleId_idx" ON "MatchAdjustment"("ruleId");

ALTER TABLE "MatchAdjustment" ADD CONSTRAINT "MatchAdjustment_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchAdjustment" ADD CONSTRAINT "MatchAdjustment_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "AdjustmentRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
