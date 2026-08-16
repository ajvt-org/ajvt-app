-- The member's number is the account's. This column was a second one, asked
-- for separately on the form, and nothing kept the two in step. Nothing has
-- written it since 0.25.0, and the seven rows where it still differed were
-- settled by hand first: the number a member signs in with is the one that
-- counts.
ALTER TABLE "Member" DROP COLUMN "phone";
