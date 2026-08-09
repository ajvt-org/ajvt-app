-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "awayPenalties" INTEGER,
ADD COLUMN     "homePenalties" INTEGER,
ADD COLUMN     "isKnockout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manOfTheMatchId" TEXT,
ADD COLUMN     "venue" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchBooking" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "minute" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Group_activityId_idx" ON "Group"("activityId");

-- CreateIndex
CREATE INDEX "MatchBooking_matchId_idx" ON "MatchBooking"("matchId");

-- CreateIndex
CREATE INDEX "Team_groupId_idx" ON "Team"("groupId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_manOfTheMatchId_fkey" FOREIGN KEY ("manOfTheMatchId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchBooking" ADD CONSTRAINT "MatchBooking_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchBooking" ADD CONSTRAINT "MatchBooking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchBooking" ADD CONSTRAINT "MatchBooking_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
