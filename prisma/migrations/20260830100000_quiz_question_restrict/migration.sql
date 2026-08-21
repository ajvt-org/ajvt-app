ALTER TABLE "QuizRoundQuestion" DROP CONSTRAINT "QuizRoundQuestion_questionId_fkey";
ALTER TABLE "QuizRoundQuestion" ADD CONSTRAINT "QuizRoundQuestion_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuizAttemptAnswer" DROP CONSTRAINT "QuizAttemptAnswer_questionId_fkey";
ALTER TABLE "QuizAttemptAnswer" ADD CONSTRAINT "QuizAttemptAnswer_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
