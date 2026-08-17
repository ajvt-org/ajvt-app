CREATE TABLE "DeletedRecord" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "deletedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeletedRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeletedRecord_kind_idx" ON "DeletedRecord"("kind");
CREATE INDEX "DeletedRecord_expiresAt_idx" ON "DeletedRecord"("expiresAt");
