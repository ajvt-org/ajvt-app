ALTER TABLE "Match" ADD COLUMN "sideATeamId" TEXT;
ALTER TABLE "Match" ADD COLUMN "sideBTeamId" TEXT;

CREATE INDEX "Match_sideATeamId_idx" ON "Match"("sideATeamId");
CREATE INDEX "Match_sideBTeamId_idx" ON "Match"("sideBTeamId");

ALTER TABLE "Match" ADD CONSTRAINT "Match_sideATeamId_fkey"
  FOREIGN KEY ("sideATeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_sideBTeamId_fkey"
  FOREIGN KEY ("sideBTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
