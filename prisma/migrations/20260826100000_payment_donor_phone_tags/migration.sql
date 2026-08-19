ALTER TABLE "Payment" ADD COLUMN "donorPhone" TEXT;

UPDATE "Payment" p
SET "donorPhone" = d."donorPhone"
FROM "Donation" d
WHERE d.id = p.id AND d."donorPhone" IS NOT NULL;

CREATE TABLE "_FinanceTagToPayment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FinanceTagToPayment_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_FinanceTagToPayment_B_index" ON "_FinanceTagToPayment"("B");

ALTER TABLE "_FinanceTagToPayment" ADD CONSTRAINT "_FinanceTagToPayment_A_fkey" FOREIGN KEY ("A") REFERENCES "FinanceTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_FinanceTagToPayment" ADD CONSTRAINT "_FinanceTagToPayment_B_fkey" FOREIGN KEY ("B") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "_FinanceTagToPayment" ("A", "B")
SELECT t."B", t."A" FROM "_DonationToFinanceTag" t
JOIN "Payment" p ON p.id = t."A";
