-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 1,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteVisit_date_idx" ON "SiteVisit"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisit_date_visitorId_key" ON "SiteVisit"("date", "visitorId");
