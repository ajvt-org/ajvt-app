-- DropIndex
DROP INDEX "MatchGoal_matchId_memberId_key";

-- AlterTable
ALTER TABLE "ActivityRegistration" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MatchGoal" ADD COLUMN     "minute" INTEGER;

-- CreateIndex
CREATE INDEX "MatchGoal_matchId_idx" ON "MatchGoal"("matchId");
