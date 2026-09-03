ALTER TABLE "Team" ADD COLUMN "captainUserId" TEXT;

CREATE INDEX "Team_captainUserId_idx" ON "Team"("captainUserId");

ALTER TABLE "Team" ADD CONSTRAINT "Team_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
