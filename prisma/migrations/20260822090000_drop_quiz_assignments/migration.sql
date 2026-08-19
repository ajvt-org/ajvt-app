DROP TABLE IF EXISTS "QuizAssignment";

ALTER TABLE "QuizSettings" DROP COLUMN IF EXISTS "questionsPerDay";
ALTER TABLE "QuizSettings" DROP COLUMN IF EXISTS "answerWindowSeconds";
ALTER TABLE "QuizSettings" DROP COLUMN IF EXISTS "minScorePercent";
ALTER TABLE "QuizSettings" DROP COLUMN IF EXISTS "lastAutoSendDate";
