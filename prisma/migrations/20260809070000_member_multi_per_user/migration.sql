-- DropIndex
DROP INDEX "Member_userId_key";

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "Member"("userId");
