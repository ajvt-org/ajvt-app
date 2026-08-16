-- CreateTable
CREATE TABLE "ExpenseTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ExpenseToExpenseTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ExpenseToExpenseTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseTag_name_key" ON "ExpenseTag"("name");

-- CreateIndex
CREATE INDEX "_ExpenseToExpenseTag_B_index" ON "_ExpenseToExpenseTag"("B");

-- AddForeignKey
ALTER TABLE "_ExpenseToExpenseTag" ADD CONSTRAINT "_ExpenseToExpenseTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExpenseToExpenseTag" ADD CONSTRAINT "_ExpenseToExpenseTag_B_fkey" FOREIGN KEY ("B") REFERENCES "ExpenseTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

