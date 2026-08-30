-- Public match cards list the scorers and the red cards unless a tournament turns it off.
ALTER TABLE "Activity" ADD COLUMN "showScorersAndCards" BOOLEAN NOT NULL DEFAULT true;
