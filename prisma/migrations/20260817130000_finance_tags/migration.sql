ALTER TABLE "ExpenseTag" RENAME TO "FinanceTag";
ALTER TABLE "FinanceTag" RENAME CONSTRAINT "ExpenseTag_pkey" TO "FinanceTag_pkey";
ALTER INDEX "ExpenseTag_name_key" RENAME TO "FinanceTag_name_key";

ALTER TABLE "_ExpenseToExpenseTag" RENAME TO "_ExpenseToFinanceTag";
ALTER TABLE "_ExpenseToFinanceTag" RENAME CONSTRAINT "_ExpenseToExpenseTag_AB_pkey" TO "_ExpenseToFinanceTag_AB_pkey";
ALTER TABLE "_ExpenseToFinanceTag" RENAME CONSTRAINT "_ExpenseToExpenseTag_A_fkey" TO "_ExpenseToFinanceTag_A_fkey";
ALTER TABLE "_ExpenseToFinanceTag" RENAME CONSTRAINT "_ExpenseToExpenseTag_B_fkey" TO "_ExpenseToFinanceTag_B_fkey";
ALTER INDEX "_ExpenseToExpenseTag_B_index" RENAME TO "_ExpenseToFinanceTag_B_index";

CREATE TABLE "_DonationToFinanceTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DonationToFinanceTag_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_DonationToFinanceTag_B_index" ON "_DonationToFinanceTag"("B");

ALTER TABLE "_DonationToFinanceTag" ADD CONSTRAINT "_DonationToFinanceTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DonationToFinanceTag" ADD CONSTRAINT "_DonationToFinanceTag_B_fkey" FOREIGN KEY ("B") REFERENCES "FinanceTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
