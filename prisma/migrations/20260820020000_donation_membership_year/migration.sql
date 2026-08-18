ALTER TABLE "Donation" ADD COLUMN "membershipYear" INTEGER;

UPDATE "Donation" d
SET "membershipYear" = m."membershipYear"
FROM "Member" m
WHERE d."memberId" = m."id" AND d."source" = 'MEMBERSHIP';

CREATE INDEX "Donation_memberId_source_membershipYear_idx"
  ON "Donation"("memberId", "source", "membershipYear");
