CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportBatch_fileHash_idx" ON "ImportBatch"("fileHash");
