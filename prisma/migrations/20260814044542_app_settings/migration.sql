-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "membershipFee" INTEGER NOT NULL DEFAULT 100,
    "supportWhatsapp" TEXT NOT NULL DEFAULT '22241070328',
    "whatsappGroup" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
