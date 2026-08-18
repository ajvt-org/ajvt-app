CREATE TABLE "QuizDay" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizDay_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizDay_competitionId_day_key" ON "QuizDay"("competitionId", "day");
CREATE INDEX "QuizDay_day_idx" ON "QuizDay"("day");
ALTER TABLE "QuizDay" ADD CONSTRAINT "QuizDay_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "QuizDayQuestion" (
  "id" TEXT NOT NULL,
  "dayId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  CONSTRAINT "QuizDayQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizDayQuestion_dayId_questionId_key" ON "QuizDayQuestion"("dayId", "questionId");
CREATE INDEX "QuizDayQuestion_dayId_idx" ON "QuizDayQuestion"("dayId");
ALTER TABLE "QuizDayQuestion" ADD CONSTRAINT "QuizDayQuestion_dayId_fkey"
  FOREIGN KEY ("dayId") REFERENCES "QuizDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizDayQuestion" ADD CONSTRAINT "QuizDayQuestion_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "QuizAttempt" (
  "id" TEXT NOT NULL,
  "dayId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "score" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizAttempt_dayId_userId_key" ON "QuizAttempt"("dayId", "userId");
CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_dayId_fkey"
  FOREIGN KEY ("dayId") REFERENCES "QuizDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
