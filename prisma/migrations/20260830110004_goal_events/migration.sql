CREATE TYPE "GoalKind" AS ENUM ('GOAL', 'PENALTY', 'OWN_GOAL');
CREATE TYPE "GoalPeriod" AS ENUM ('REGULAR', 'EXTRA_TIME');

ALTER TABLE "MatchGoal" ADD COLUMN "kind" "GoalKind" NOT NULL DEFAULT 'GOAL';
ALTER TABLE "MatchGoal" ADD COLUMN "period" "GoalPeriod" NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "MatchGoal" ALTER COLUMN "memberId" DROP NOT NULL;

CREATE TABLE "MatchPenaltyKick" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "memberId" TEXT,
    "order" INTEGER NOT NULL,
    "scored" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchPenaltyKick_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchPenaltyKick_matchId_order_key" ON "MatchPenaltyKick"("matchId", "order");

ALTER TABLE "MatchPenaltyKick" ADD CONSTRAINT "MatchPenaltyKick_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchPenaltyKick" ADD CONSTRAINT "MatchPenaltyKick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchPenaltyKick" ADD CONSTRAINT "MatchPenaltyKick_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
