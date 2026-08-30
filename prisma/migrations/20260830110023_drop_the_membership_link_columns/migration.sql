DO $$
DECLARE
  drifted bigint;
BEGIN
  SELECT sum(n) INTO drifted FROM (
    SELECT count(*) n FROM "Membership" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "TeamMember" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "MvpCandidate" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "MatchBooking" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "MatchGoal" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "MatchPenaltyKick" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "ActivityRegistration" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "Donation" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "Payment" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "Receipt" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "Suspension" t LEFT JOIN "Member" m ON m.id = t."memberId"
      WHERE t."memberId" IS NOT NULL AND (t."userId" IS NULL OR m."userId" IS DISTINCT FROM t."userId")
    UNION ALL SELECT count(*) FROM "Match" t LEFT JOIN "Member" m ON m.id = t."manOfTheMatchId"
      WHERE t."manOfTheMatchId" IS NOT NULL
        AND (t."manOfTheMatchUserId" IS NULL OR m."userId" IS DISTINCT FROM t."manOfTheMatchUserId")
  ) counts;

  IF drifted > 0 THEN
    RAISE EXCEPTION 'A membership link does not agree with its account on % row(s)', drifted;
  END IF;
END $$;

ALTER TABLE "Membership" DROP COLUMN "memberId";
ALTER TABLE "TeamMember" DROP COLUMN "memberId";
ALTER TABLE "MvpCandidate" DROP COLUMN "memberId";
ALTER TABLE "MatchBooking" DROP COLUMN "memberId";
ALTER TABLE "MatchGoal" DROP COLUMN "memberId";
ALTER TABLE "MatchPenaltyKick" DROP COLUMN "memberId";
ALTER TABLE "ActivityRegistration" DROP COLUMN "memberId";
ALTER TABLE "Donation" DROP COLUMN "memberId";
ALTER TABLE "Payment" DROP COLUMN "memberId";
ALTER TABLE "Receipt" DROP COLUMN "memberId";
ALTER TABLE "Suspension" DROP COLUMN "memberId";
ALTER TABLE "Match" DROP COLUMN "manOfTheMatchId";
