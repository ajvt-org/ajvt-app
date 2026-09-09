ALTER TABLE "AppSettings"
  ADD COLUMN "asksBankReference" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showsReferenceCode" BOOLEAN NOT NULL DEFAULT false;
