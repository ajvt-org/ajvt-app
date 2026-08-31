-- The membership year record is the only copy of a membership. What the member
-- row mirrored is dropped, along with the two columns on the year record that
-- nothing has written since the money moved to the payment.
DROP INDEX "Member_membershipYear_idx";

ALTER TABLE "Member"
  DROP COLUMN "paymentMethod",
  DROP COLUMN "paymentProof",
  DROP COLUMN "paidAmount",
  DROP COLUMN "surplusAnonymous",
  DROP COLUMN "referenceCode",
  DROP COLUMN "status",
  DROP COLUMN "rejectionReason",
  DROP COLUMN "membershipYear";

ALTER TABLE "Membership"
  DROP COLUMN "paidAmount",
  DROP COLUMN "surplusAnonymous";
