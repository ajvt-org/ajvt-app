ALTER TABLE "Membership" DROP CONSTRAINT "Membership_accountId_fkey";

DROP INDEX "Membership_accountId_idx";
DROP INDEX "Membership_bankReference_idx";
DROP INDEX "Membership_referenceCode_key";

ALTER TABLE "Membership"
  DROP COLUMN "paymentMethod",
  DROP COLUMN "accountId",
  DROP COLUMN "bankReference",
  DROP COLUMN "paymentProof",
  DROP COLUMN "referenceCode",
  DROP COLUMN "recordedBy",
  DROP COLUMN "reviewedBy",
  DROP COLUMN "reviewedAt";
