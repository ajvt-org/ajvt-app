CREATE TYPE "QuizVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

ALTER TABLE "Competition" ADD COLUMN "visibility" "QuizVisibility" NOT NULL DEFAULT 'PUBLIC';

CREATE TABLE "QuizParticipant" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizParticipant_competitionId_userId_key" ON "QuizParticipant"("competitionId", "userId");
CREATE INDEX "QuizParticipant_userId_idx" ON "QuizParticipant"("userId");
ALTER TABLE "QuizParticipant" ADD CONSTRAINT "QuizParticipant_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizParticipant" ADD CONSTRAINT "QuizParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
