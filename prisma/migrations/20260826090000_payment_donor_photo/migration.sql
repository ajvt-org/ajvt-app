ALTER TABLE "Payment" ADD COLUMN "donorPhoto" TEXT;

UPDATE "Payment" p
SET "donorPhoto" = d."donorPhoto"
FROM "Donation" d
WHERE d.id = p.id AND d."donorPhoto" IS NOT NULL;
