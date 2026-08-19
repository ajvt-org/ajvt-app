CREATE TABLE "QuizBoard" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blockRounds" INTEGER NOT NULL DEFAULT 1,
    "counting" INTEGER NOT NULL DEFAULT 1,
    "wholeRun" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizBoard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuizBoard_competitionId_idx" ON "QuizBoard"("competitionId");

ALTER TABLE "QuizBoard" ADD CONSTRAINT "QuizBoard_competitionId_fkey"
    FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "QuizBoard" ("id", "competitionId", "title", "blockRounds", "counting", "wholeRun", "order")
SELECT gen_random_uuid()::text, c."id", 'ترتيب الجولة', 1, 1, false, 0 FROM "Competition" c
UNION ALL
SELECT gen_random_uuid()::text, c."id", 'ترتيب المجموعة', c."groupSize", c."countingRounds", false, 1 FROM "Competition" c
UNION ALL
SELECT gen_random_uuid()::text, c."id", 'الترتيب العام', c."groupSize", c."countingRounds", true, 2 FROM "Competition" c;

ALTER TABLE "Competition" DROP COLUMN "groupSize";
ALTER TABLE "Competition" DROP COLUMN "countingRounds";
