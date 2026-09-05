ALTER TABLE "Activity" ADD COLUMN "minTeamSize" INTEGER;
ALTER TABLE "Activity" ADD COLUMN "maxTeamSize" INTEGER;
ALTER TABLE "Activity" ADD COLUMN "organisedByTaguilalett" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Activity" ADD COLUMN "outsidePlayerLimit" INTEGER;

UPDATE "Activity" SET "minTeamSize" = "teamSize", "maxTeamSize" = "teamSize";

ALTER TABLE "Activity" DROP COLUMN "teamSize";

ALTER TABLE "Team" ADD COLUMN "fromTaguilalett" BOOLEAN NOT NULL DEFAULT true;
