-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "isVolunteer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappLink" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- Preserve the current display order (previously sorted by createdAt ASC)
-- as the initial explicit order, so existing activities don't all collapse
-- to the same position until an admin reorders them.
UPDATE "Activity" a
SET "order" = sub.rn - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "Activity"
) sub
WHERE a.id = sub.id;
