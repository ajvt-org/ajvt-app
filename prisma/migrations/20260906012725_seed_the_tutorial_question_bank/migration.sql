ALTER TABLE "QuizQuestion" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "QuizSettings" ADD COLUMN "tutorialFullSeconds" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "QuizSettings" ADD COLUMN "tutorialMaxSeconds" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "QuizSettings" ADD COLUMN "tutorialFloorPercent" INTEGER NOT NULL DEFAULT 50;

INSERT INTO "QuestionBank" ("id", "name", "createdAt", "updatedAt")
VALUES ('tutorial', 'بنك الجولة التجريبية', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "QuizQuestion" ("id", "text", "category", "points", "correctCount", "order", "bankId", "active", "createdBy", "createdAt", "updatedAt")
SELECT seed."id", seed."text", 'تجربة', seed."points", 1, seed."order", 'tutorial', TRUE, 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('tutorial-q1', 'ما عاصمة موريتانيا؟', 10, 0),
  ('tutorial-q2', 'كم عدد أيام الأسبوع؟', 10, 1),
  ('tutorial-q3', 'كم عدد ألوان قوس قزح؟', 20, 2)
) AS seed("id", "text", "points", "order")
WHERE EXISTS (SELECT 1 FROM "QuestionBank" WHERE "id" = 'tutorial')
  AND NOT EXISTS (SELECT 1 FROM "QuizQuestion" WHERE "bankId" = 'tutorial');

INSERT INTO "QuizAnswer" ("id", "questionId", "text", "isCorrect", "order")
SELECT seed."id", seed."questionId", seed."text", seed."isCorrect", seed."order"
FROM (VALUES
  ('tutorial-q1-a', 'tutorial-q1', 'نواكشوط', TRUE, 0),
  ('tutorial-q1-b', 'tutorial-q1', 'نواذيبو', FALSE, 1),
  ('tutorial-q1-c', 'tutorial-q1', 'كيفة', FALSE, 2),
  ('tutorial-q1-d', 'tutorial-q1', 'روصو', FALSE, 3),
  ('tutorial-q2-a', 'tutorial-q2', 'خمسة', FALSE, 0),
  ('tutorial-q2-b', 'tutorial-q2', 'ستة', FALSE, 1),
  ('tutorial-q2-c', 'tutorial-q2', 'سبعة', TRUE, 2),
  ('tutorial-q2-d', 'tutorial-q2', 'ثمانية', FALSE, 3),
  ('tutorial-q3-a', 'tutorial-q3', 'خمسة', FALSE, 0),
  ('tutorial-q3-b', 'tutorial-q3', 'ستة', FALSE, 1),
  ('tutorial-q3-c', 'tutorial-q3', 'سبعة', TRUE, 2),
  ('tutorial-q3-d', 'tutorial-q3', 'ثمانية', FALSE, 3)
) AS seed("id", "questionId", "text", "isCorrect", "order")
WHERE EXISTS (SELECT 1 FROM "QuizQuestion" WHERE "id" = seed."questionId")
ON CONFLICT DO NOTHING;
