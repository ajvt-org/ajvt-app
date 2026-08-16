ALTER TABLE "Member" ADD COLUMN "verifyToken" TEXT;

UPDATE "Member"
SET "verifyToken" = replace(gen_random_uuid()::text, '-', '')
WHERE "memberNumber" IS NOT NULL;

CREATE UNIQUE INDEX "Member_verifyToken_key" ON "Member"("verifyToken");
