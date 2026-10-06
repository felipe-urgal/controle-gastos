ALTER TABLE "merchants"
ADD COLUMN "normalized_name" VARCHAR(120)
GENERATED ALWAYS AS (
  lower(regexp_replace(btrim("name"), '[[:space:]]+', ' ', 'g'))
) STORED;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "merchants"
    GROUP BY "userId", "normalized_name"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existem estabelecimentos legados com nomes equivalentes. Resolva as duplicatas antes de aplicar a constraint merchants_user_normalized_name_key.';
  END IF;
END $$;

CREATE UNIQUE INDEX "merchants_user_normalized_name_key"
ON "merchants"("userId", "normalized_name");

CREATE INDEX "merchant_aliases_user_operator_pattern_priority_id_idx"
ON "merchant_aliases"("userId", "operator", "normalized_pattern", "priority", "id");
