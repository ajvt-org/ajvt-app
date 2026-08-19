ALTER TABLE "Competition" ADD COLUMN "bankId" TEXT NOT NULL DEFAULT 'general';

CREATE INDEX "Competition_bankId_idx" ON "Competition"("bankId");

ALTER TABLE "Competition" ADD CONSTRAINT "Competition_bankId_fkey"
    FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
