ALTER TABLE "Competition" ADD COLUMN "categoryRounds" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "QuizRound" ADD COLUMN "category" TEXT;
