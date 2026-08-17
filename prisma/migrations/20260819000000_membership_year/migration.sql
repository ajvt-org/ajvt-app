ALTER TABLE "AppSettings" ADD COLUMN "membershipYear" INTEGER;

ALTER TABLE "Member" ADD COLUMN "membershipYear" INTEGER;

UPDATE "Member" SET "membershipYear" = EXTRACT(YEAR FROM "createdAt")::INTEGER;

ALTER TABLE "Member" ALTER COLUMN "membershipYear" SET NOT NULL;

ALTER TABLE "Member"
  ALTER COLUMN "membershipYear"
  SET DEFAULT EXTRACT(YEAR FROM now() AT TIME ZONE 'UTC')::INTEGER;

CREATE INDEX "Member_membershipYear_idx" ON "Member"("membershipYear");
