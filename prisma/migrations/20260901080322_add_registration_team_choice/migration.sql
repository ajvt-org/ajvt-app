ALTER TABLE "ActivityRegistration" ADD COLUMN "chosenTeamId" TEXT;
ALTER TABLE "ActivityRegistration" ADD COLUMN "teamNudgeSentAt" TIMESTAMP(3);

CREATE INDEX "ActivityRegistration_chosenTeamId_idx" ON "ActivityRegistration"("chosenTeamId");

ALTER TABLE "ActivityRegistration"
  ADD CONSTRAINT "ActivityRegistration_chosenTeamId_fkey"
  FOREIGN KEY ("chosenTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
