ALTER TABLE "Match" ADD COLUMN "forfeitWinnerTeamId" TEXT;

CREATE INDEX "Match_forfeitWinnerTeamId_idx" ON "Match"("forfeitWinnerTeamId");

ALTER TABLE "Match" ADD CONSTRAINT "Match_forfeitWinnerTeamId_fkey" FOREIGN KEY ("forfeitWinnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
