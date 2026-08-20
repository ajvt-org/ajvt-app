ALTER TABLE "QuizSettings" ADD COLUMN "confirmAnswers" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "QuizRound" ADD COLUMN "confirmAnswers" BOOLEAN;
