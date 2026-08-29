UPDATE "User" u SET
    "fullName" = COALESCE(u."fullName", m."fullName"),
    "age" = COALESCE(u."age", m."age"),
    "village" = m."village",
    "photo" = COALESCE(u."photo", m."photo"),
    "memberNumber" = COALESCE(u."memberNumber", m."memberNumber"),
    "verifyToken" = COALESCE(u."verifyToken", m."verifyToken")
FROM "Member" m
WHERE m."userId" = u."id"
  AND (
    u."fullName" IS DISTINCT FROM m."fullName"
    OR u."age" IS DISTINCT FROM m."age"
    OR u."village" IS DISTINCT FROM m."village"
    OR u."photo" IS DISTINCT FROM m."photo"
    OR u."memberNumber" IS DISTINCT FROM m."memberNumber"
    OR u."verifyToken" IS DISTINCT FROM m."verifyToken"
  );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Member" m
        JOIN "User" u ON u."id" = m."userId"
        WHERE u."fullName" IS DISTINCT FROM m."fullName"
           OR u."age" IS DISTINCT FROM m."age"
           OR u."village" IS DISTINCT FROM m."village"
           OR u."photo" IS DISTINCT FROM m."photo"
           OR u."memberNumber" IS DISTINCT FROM m."memberNumber"
           OR u."verifyToken" IS DISTINCT FROM m."verifyToken"
    ) THEN
        RAISE EXCEPTION 'refusing to drop: a member carries a person the account does not';
    END IF;
END $$;

DROP INDEX IF EXISTS "Member_memberNumber_key";

DROP INDEX IF EXISTS "Member_verifyToken_key";

ALTER TABLE "Member"
    DROP COLUMN "fullName",
    DROP COLUMN "age",
    DROP COLUMN "village",
    DROP COLUMN "photo",
    DROP COLUMN "memberNumber",
    DROP COLUMN "verifyToken";
