ALTER TABLE "Activity" ADD COLUMN "mvpVoteMinutes" INTEGER NOT NULL DEFAULT 120;

ALTER TABLE "MatchMvpVote" ADD COLUMN "closesAt" TIMESTAMP(3);

UPDATE "MatchMvpVote"
SET "closesAt" = COALESCE("closedAt", "createdAt" + INTERVAL '120 minutes');

ALTER TABLE "MatchMvpVote" ALTER COLUMN "closesAt" SET NOT NULL;
