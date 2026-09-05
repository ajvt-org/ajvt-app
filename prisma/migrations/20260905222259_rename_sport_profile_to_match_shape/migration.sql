ALTER TYPE "SportProfile" RENAME TO "MatchShape";

ALTER TYPE "MatchShape" RENAME VALUE 'BOARD' TO 'SERIES';

ALTER TABLE "Activity" RENAME COLUMN "profile" TO "matchShape";
