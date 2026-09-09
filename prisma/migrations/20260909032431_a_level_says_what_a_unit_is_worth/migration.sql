CREATE TYPE "WorthWhen" AS ENUM ('LOSER_ON_NOTHING', 'WINNER_LOST_CREDIT');

CREATE TABLE "WorthRule" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "levelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "when" "WorthWhen" NOT NULL,
  "worth" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorthRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorthRule_activityId_name_key" ON "WorthRule"("activityId", "name");
CREATE INDEX "WorthRule_activityId_idx" ON "WorthRule"("activityId");
CREATE INDEX "WorthRule_levelId_idx" ON "WorthRule"("levelId");

ALTER TABLE "WorthRule"
  ADD CONSTRAINT "WorthRule_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "WorthRule_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "MatchLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchUnit"
  ADD COLUMN "worthRuleId" TEXT,
  ADD COLUMN "worthKept" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "MatchUnit_worthRuleId_idx" ON "MatchUnit"("worthRuleId");

ALTER TABLE "MatchUnit"
  ADD CONSTRAINT "MatchUnit_worthRuleId_fkey" FOREIGN KEY ("worthRuleId") REFERENCES "WorthRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
