ALTER TABLE "Activity" ADD COLUMN "playersBuildTeams" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TeamMember" ADD COLUMN "invitedByCaptain" BOOLEAN NOT NULL DEFAULT false;
