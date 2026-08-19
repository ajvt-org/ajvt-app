DROP TABLE IF EXISTS "QuizAttemptAnswer" CASCADE;
DROP TABLE IF EXISTS "QuizAttempt" CASCADE;
DROP TABLE IF EXISTS "QuizDayQuestion" CASCADE;
DROP TABLE IF EXISTS "QuizDay" CASCADE;
DROP TABLE IF EXISTS "Competition" CASCADE;

CREATE TABLE "Competition" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "roundCount" INTEGER NOT NULL DEFAULT 30,
  "roundPeriodMinutes" INTEGER NOT NULL DEFAULT 1440,
  "roundWindowMinutes" INTEGER NOT NULL DEFAULT 840,
  "servedCount" INTEGER NOT NULL DEFAULT 10,
  "poolSize" INTEGER NOT NULL DEFAULT 30,
  "groupSize" INTEGER NOT NULL DEFAULT 7,
  "countingRounds" INTEGER NOT NULL DEFAULT 6,
  "speedBands" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizRound" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  "opensAt" TIMESTAMP(3) NOT NULL,
  "closesAt" TIMESTAMP(3) NOT NULL,
  "announcedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizRound_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizRound_competitionId_index_key" ON "QuizRound"("competitionId", "index");
CREATE INDEX "QuizRound_opensAt_idx" ON "QuizRound"("opensAt");
ALTER TABLE "QuizRound" ADD CONSTRAINT "QuizRound_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "QuizRoundQuestion" (
  "id" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  CONSTRAINT "QuizRoundQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizRoundQuestion_roundId_questionId_key" ON "QuizRoundQuestion"("roundId", "questionId");
CREATE INDEX "QuizRoundQuestion_roundId_idx" ON "QuizRoundQuestion"("roundId");
ALTER TABLE "QuizRoundQuestion" ADD CONSTRAINT "QuizRoundQuestion_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "QuizRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizRoundQuestion" ADD CONSTRAINT "QuizRoundQuestion_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "QuizAttempt" (
  "id" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "score" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizAttempt_roundId_userId_key" ON "QuizAttempt"("roundId", "userId");
CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "QuizRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "QuizAttemptAnswer" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "optionOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "shownAt" TIMESTAMP(3),
  "answeredAt" TIMESTAMP(3),
  "selectedAnswerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isCorrect" BOOLEAN,
  "elapsedMs" INTEGER,
  "points" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuizAttemptAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizAttemptAnswer_attemptId_position_key" ON "QuizAttemptAnswer"("attemptId", "position");
CREATE INDEX "QuizAttemptAnswer_attemptId_idx" ON "QuizAttemptAnswer"("attemptId");
ALTER TABLE "QuizAttemptAnswer" ADD CONSTRAINT "QuizAttemptAnswer_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttemptAnswer" ADD CONSTRAINT "QuizAttemptAnswer_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
