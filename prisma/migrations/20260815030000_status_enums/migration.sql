CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');
CREATE TYPE "TeamMemberStatus" AS ENUM ('PENDING', 'ACTIVE');
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'PLAYED');
CREATE TYPE "MvpVoteStatus" AS ENUM ('OPEN', 'CLOSED');

ALTER TABLE "Member" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Member" ALTER COLUMN "status" TYPE "ReviewStatus" USING "status"::"ReviewStatus";
ALTER TABLE "Member" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "ActivityRegistration" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ActivityRegistration" ALTER COLUMN "status" TYPE "ReviewStatus" USING "status"::"ReviewStatus";
ALTER TABLE "ActivityRegistration" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Donation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Donation" ALTER COLUMN "status" TYPE "ReviewStatus" USING "status"::"ReviewStatus";
ALTER TABLE "Donation" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "TeamMember" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "TeamMember" ALTER COLUMN "status" TYPE "TeamMemberStatus" USING "status"::"TeamMemberStatus";
ALTER TABLE "TeamMember" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "Match" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Match" ALTER COLUMN "status" TYPE "MatchStatus" USING "status"::"MatchStatus";
ALTER TABLE "Match" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

ALTER TABLE "MatchMvpVote" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MatchMvpVote" ALTER COLUMN "status" TYPE "MvpVoteStatus" USING "status"::"MvpVoteStatus";
ALTER TABLE "MatchMvpVote" ALTER COLUMN "status" SET DEFAULT 'OPEN';
