CREATE TYPE "MatchEnding" AS ENUM ('PLAY_ALL', 'FIRST_TO');
CREATE TYPE "PartDecision" AS ENUM ('OUTCOME', 'POINTS', 'SCORE');
CREATE TYPE "PartOutcome" AS ENUM ('SIDE_A', 'SIDE_B', 'DRAW');

ALTER TABLE "Activity" ADD COLUMN "partsPerMatch" INTEGER;
ALTER TABLE "Activity" ADD COLUMN "matchEnding" "MatchEnding";
ALTER TABLE "Activity" ADD COLUMN "partsToWin" INTEGER;
ALTER TABLE "Activity" ADD COLUMN "partDecision" "PartDecision";
ALTER TABLE "Activity" ADD COLUMN "partTarget" INTEGER;
ALTER TABLE "Activity" ADD COLUMN "partWord" TEXT;
ALTER TABLE "Activity" ADD COLUMN "partsWord" TEXT;

CREATE TABLE "MatchPart" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "abandoned" BOOLEAN NOT NULL DEFAULT false,
  "outcome" "PartOutcome",
  "sideAPoints" INTEGER,
  "sideBPoints" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MatchPart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchPart_matchId_order_key" ON "MatchPart"("matchId", "order");
CREATE INDEX "MatchPart_matchId_idx" ON "MatchPart"("matchId");

ALTER TABLE "MatchPart" ADD CONSTRAINT "MatchPart_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
