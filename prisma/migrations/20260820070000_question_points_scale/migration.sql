UPDATE "QuizQuestion" SET "points" = 20 WHERE "points" > 20;
UPDATE "QuizQuestion" SET "points" = 1 WHERE "points" < 1;

ALTER TABLE "QuizSettings" ALTER COLUMN "defaultPoints" SET DEFAULT 10;
