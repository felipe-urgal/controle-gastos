DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "transaction_import_rules"
    GROUP BY
      "userId",
      COALESCE("accountId", ''),
      "transactionType",
      "descriptionOperator",
      lower(
        regexp_replace(
          normalize(btrim("descriptionPattern"), NFKC),
          '[[:space:]]+',
          ' ',
          'g'
        )
      ),
      COALESCE("minAmountCents", -1),
      COALESCE("maxAmountCents", -1)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existem regras de importacao legadas com matcher equivalente. Resolva as duplicatas antes de aplicar transaction_import_rules_matcher_identity_key.';
  END IF;
END $$;

CREATE UNIQUE INDEX "transaction_import_rules_matcher_identity_key"
ON "transaction_import_rules" (
  "userId",
  (COALESCE("accountId", '')),
  "transactionType",
  "descriptionOperator",
  (
    lower(
      regexp_replace(
        normalize(btrim("descriptionPattern"), NFKC),
        '[[:space:]]+',
        ' ',
        'g'
      )
    )
  ),
  (COALESCE("minAmountCents", -1)),
  (COALESCE("maxAmountCents", -1))
);
