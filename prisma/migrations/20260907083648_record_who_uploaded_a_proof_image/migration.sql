ALTER TABLE "ProofImage" ADD COLUMN "uploadedByUserId" TEXT;
ALTER TABLE "ProofImage" ADD COLUMN "uploadedByAdminId" TEXT;

CREATE INDEX "ProofImage_uploadedByUserId_idx" ON "ProofImage"("uploadedByUserId");
CREATE INDEX "ProofImage_uploadedByAdminId_idx" ON "ProofImage"("uploadedByAdminId");

ALTER TABLE "ProofImage" ADD CONSTRAINT "ProofImage_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProofImage" ADD CONSTRAINT "ProofImage_uploadedByAdminId_fkey" FOREIGN KEY ("uploadedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
