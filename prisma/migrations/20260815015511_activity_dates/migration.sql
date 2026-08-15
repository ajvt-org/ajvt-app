-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "withTime" BOOLEAN NOT NULL DEFAULT false;
