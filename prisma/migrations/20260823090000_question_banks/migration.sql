CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionBank_name_key" ON "QuestionBank"("name");

INSERT INTO "QuestionBank" ("id", "name", "createdAt", "updatedAt")
VALUES ('general', 'البنك العام', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "QuizQuestion" ADD COLUMN "bankId" TEXT;
UPDATE "QuizQuestion" SET "bankId" = 'general';
ALTER TABLE "QuizQuestion" ALTER COLUMN "bankId" SET NOT NULL;
ALTER TABLE "QuizQuestion" ALTER COLUMN "bankId" SET DEFAULT 'general';

CREATE INDEX "QuizQuestion_bankId_idx" ON "QuizQuestion"("bankId");

ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_bankId_fkey"
    FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
