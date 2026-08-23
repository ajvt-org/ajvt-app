-- DropIndex
DROP INDEX "Competition_bankId_idx";

-- DropIndex
DROP INDEX "Donation_memberId_source_membershipYear_idx";

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "membershipYear" SET DEFAULT EXTRACT(YEAR FROM now() AT TIME ZONE 'UTC')::INTEGER;
