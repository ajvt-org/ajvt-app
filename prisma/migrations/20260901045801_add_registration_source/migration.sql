CREATE TYPE "RegistrationSource" AS ENUM ('SELF', 'ADMIN');

ALTER TABLE "ActivityRegistration"
  ADD COLUMN "source" "RegistrationSource",
  ADD COLUMN "recordedBy" TEXT;
