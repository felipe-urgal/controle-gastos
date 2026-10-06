ALTER TABLE "transaction_templates"
ADD COLUMN "normalized_name" VARCHAR(80)
GENERATED ALWAYS AS (
  lower(regexp_replace(btrim("name"), '[[:space:]]+', ' ', 'g'))
) STORED;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "transaction_templates"
    GROUP BY "userId", "normalized_name"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existem Modelos legados com nomes equivalentes. Resolva as duplicatas antes de aplicar transaction_templates_user_normalized_name_key.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "transaction_templates_userId_name_key"
ON "transaction_templates"("userId", "name");

CREATE UNIQUE INDEX "transaction_templates_user_normalized_name_key"
ON "transaction_templates"("userId", "normalized_name");
