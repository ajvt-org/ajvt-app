-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "referenceCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Member_referenceCode_key" ON "Member"("referenceCode");
