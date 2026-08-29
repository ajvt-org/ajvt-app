ALTER TABLE "Membership" ADD COLUMN "userId" TEXT;
UPDATE "Membership" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "Membership" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Membership" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember" ADD COLUMN "userId" TEXT;
UPDATE "TeamMember" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "TeamMember" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "TeamMember" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MvpCandidate" ADD COLUMN "userId" TEXT;
UPDATE "MvpCandidate" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "MvpCandidate" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "MvpCandidate" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "MvpCandidate" ADD CONSTRAINT "MvpCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchBooking" ADD COLUMN "userId" TEXT;
UPDATE "MatchBooking" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "MatchBooking" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "MatchBooking" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "MatchBooking" ADD CONSTRAINT "MatchBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchGoal" ADD COLUMN "userId" TEXT;
UPDATE "MatchGoal" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "MatchGoal" ADD CONSTRAINT "MatchGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchPenaltyKick" ADD COLUMN "userId" TEXT;
UPDATE "MatchPenaltyKick" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "MatchPenaltyKick" ADD CONSTRAINT "MatchPenaltyKick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityRegistration" ADD COLUMN "userId" TEXT;
UPDATE "ActivityRegistration" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "ActivityRegistration" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ActivityRegistration" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "ActivityRegistration" ADD CONSTRAINT "ActivityRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Donation" ADD COLUMN "userId" TEXT;
UPDATE "Donation" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD COLUMN "userId" TEXT;
UPDATE "Payment" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Receipt" ADD COLUMN "userId" TEXT;
UPDATE "Receipt" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Suspension" ADD COLUMN "userId" TEXT;
UPDATE "Suspension" t SET "userId" = m."userId" FROM "Member" m WHERE m."id" = t."memberId";
ALTER TABLE "Suspension" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Suspension" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "Suspension" ADD CONSTRAINT "Suspension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Match" ADD COLUMN "manOfTheMatchUserId" TEXT;
UPDATE "Match" t SET "manOfTheMatchUserId" = m."userId" FROM "Member" m WHERE m."id" = t."manOfTheMatchId";
ALTER TABLE "Match" ADD CONSTRAINT "Match_manOfTheMatchUserId_fkey" FOREIGN KEY ("manOfTheMatchUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Membership_userId_year_key" ON "Membership"("userId", "year");
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE UNIQUE INDEX "MvpCandidate_voteId_userId_key" ON "MvpCandidate"("voteId", "userId");
CREATE UNIQUE INDEX "ActivityRegistration_userId_activityId_key" ON "ActivityRegistration"("userId", "activityId");
CREATE INDEX "Donation_userId_idx" ON "Donation"("userId");
CREATE INDEX "Payment_userId_year_purpose_idx" ON "Payment"("userId", "year", "purpose");
CREATE INDEX "Receipt_userId_idx" ON "Receipt"("userId");
CREATE INDEX "Suspension_activityId_userId_idx" ON "Suspension"("activityId", "userId");
