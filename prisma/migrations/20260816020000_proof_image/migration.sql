-- CreateTable
CREATE TABLE "ProofImage" (
    "filename" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofImage_pkey" PRIMARY KEY ("filename")
);

-- CreateIndex
CREATE INDEX "ProofImage_sha256_idx" ON "ProofImage"("sha256");

