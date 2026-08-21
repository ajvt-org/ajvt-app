ALTER TABLE "QuizAttempt" ADD COLUMN "voidedAt" TIMESTAMP(3);

ALTER TABLE "QuizAttempt" ADD COLUMN "voidedBy" TEXT;
