INSERT INTO "PaymentAccount" ("id", "methodId", "code", "position", "createdAt", "updatedAt")
SELECT gen_random_uuid()::TEXT, "PaymentMethod"."id", codes."code", 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "PaymentMethod"
JOIN (VALUES
  ('بنكيلي', '027217'),
  ('السداد', '08493'),
  ('مصرفي', '037940')
) AS codes("name", "code") ON codes."name" = "PaymentMethod"."name";
