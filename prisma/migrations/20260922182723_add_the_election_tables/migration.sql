CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "allowBlank" BOOLEAN NOT NULL DEFAULT false,
    "shuffleCandidates" BOOLEAN NOT NULL DEFAULT false,
    "showResults" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ElectionCandidate" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "photo" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ElectionCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ElectionBallot" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateId" TEXT,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionBallot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ElectionCandidate_electionId_idx" ON "ElectionCandidate"("electionId");

CREATE INDEX "ElectionBallot_candidateId_idx" ON "ElectionBallot"("candidateId");

CREATE UNIQUE INDEX "ElectionBallot_electionId_userId_key" ON "ElectionBallot"("electionId", "userId");

ALTER TABLE "ElectionCandidate"
  ADD CONSTRAINT "ElectionCandidate_electionId_fkey"
  FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ElectionBallot"
  ADD CONSTRAINT "ElectionBallot_electionId_fkey"
  FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ElectionBallot"
  ADD CONSTRAINT "ElectionBallot_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ElectionBallot"
  ADD CONSTRAINT "ElectionBallot_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "ElectionCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
