ALTER TABLE "User"
    ALTER COLUMN "phone" DROP NOT NULL,
    ALTER COLUMN "password" DROP NOT NULL,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "fullName" TEXT,
    ADD COLUMN "age" TEXT,
    ADD COLUMN "village" TEXT NOT NULL DEFAULT 'التاكلالت',
    ADD COLUMN "photo" TEXT,
    ADD COLUMN "memberNumber" TEXT,
    ADD COLUMN "verifyToken" TEXT;

UPDATE "User" u SET
    "fullName" = m."fullName",
    "age" = m."age",
    "village" = m."village",
    "photo" = m."photo",
    "memberNumber" = m."memberNumber",
    "verifyToken" = m."verifyToken",
    "updatedAt" = m."updatedAt"
FROM "Member" m
WHERE m."userId" = u."id";

INSERT INTO "User" (
    "id", "phone", "password", "fullName", "age", "village", "photo",
    "memberNumber", "verifyToken", "createdAt", "updatedAt"
)
SELECT
    'usr_' || m."id", NULL, NULL, m."fullName", m."age", m."village", m."photo",
    m."memberNumber", m."verifyToken", m."createdAt", m."updatedAt"
FROM "Member" m
WHERE m."userId" IS NULL;

UPDATE "Member" m SET "userId" = 'usr_' || m."id" WHERE m."userId" IS NULL;

ALTER TABLE "Member" ALTER COLUMN "userId" SET NOT NULL;

CREATE UNIQUE INDEX "User_memberNumber_key" ON "User"("memberNumber");

CREATE UNIQUE INDEX "User_verifyToken_key" ON "User"("verifyToken");
