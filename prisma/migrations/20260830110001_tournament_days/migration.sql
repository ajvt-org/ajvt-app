-- CreateTable
CREATE TABLE "TournamentDay" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isRest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentDay_activityId_position_key" ON "TournamentDay"("activityId", "position");

-- AddForeignKey
ALTER TABLE "TournamentDay" ADD CONSTRAINT "TournamentDay_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "dayId" TEXT;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "TournamentDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
