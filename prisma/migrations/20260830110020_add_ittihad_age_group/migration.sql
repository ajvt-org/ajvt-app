INSERT INTO "AgeGroup" ("id", "name", "approved")
SELECT 'age_ittihad', 'الاتحاد', true
WHERE NOT EXISTS (SELECT 1 FROM "AgeGroup" WHERE "name" = 'الاتحاد');
