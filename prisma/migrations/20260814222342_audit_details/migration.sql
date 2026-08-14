-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "adminId" TEXT,
ADD COLUMN     "adminRole" TEXT,
ADD COLUMN     "after" JSONB,
ADD COLUMN     "before" JSONB,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "targetId" TEXT,
ADD COLUMN     "targetType" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
