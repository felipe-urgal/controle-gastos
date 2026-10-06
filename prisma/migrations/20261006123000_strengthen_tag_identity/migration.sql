ALTER TABLE "tags"
ADD COLUMN "normalized_name" VARCHAR(40);

DROP INDEX "tags_userId_name_key";

WITH canonical AS (
  SELECT
    "id",
    regexp_replace(
      regexp_replace(
        normalize(btrim("name"), NFC),
        '^[#]+[[:space:]]*',
        ''
      ),
      '[[:space:]]+',
      ' ',
      'g'
    ) AS "canonical_name"
  FROM "tags"
)
UPDATE "tags" AS t
SET "name" = CASE
  WHEN c."canonical_name" = '' THEN 'tag-' || t."id"
  ELSE c."canonical_name"
END
FROM canonical AS c
WHERE c."id" = t."id";

UPDATE "tags"
SET "normalized_name" = lower(normalize("name", NFC));

WITH ranked AS (
  SELECT
    "id",
    first_value("id") OVER (
      PARTITION BY "userId", "normalized_name"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS "keeper_id",
    row_number() OVER (
      PARTITION BY "userId", "normalized_name"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS "position"
  FROM "tags"
),
duplicates AS (
  SELECT "id" AS "duplicate_id", "keeper_id"
  FROM ranked
  WHERE "position" > 1
)
INSERT INTO "transaction_tags" ("userId", "transaction_id", "tag_id", "created_at")
SELECT
  tt."userId",
  tt."transaction_id",
  d."keeper_id",
  tt."created_at"
FROM "transaction_tags" AS tt
INNER JOIN duplicates AS d
  ON d."duplicate_id" = tt."tag_id"
ON CONFLICT ("transaction_id", "tag_id") DO NOTHING;

WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "userId", "normalized_name"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS "position"
  FROM "tags"
)
DELETE FROM "transaction_tags"
WHERE "tag_id" IN (
  SELECT "id"
  FROM ranked
  WHERE "position" > 1
);

WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "userId", "normalized_name"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS "position"
  FROM "tags"
)
DELETE FROM "tags"
WHERE "id" IN (
  SELECT "id"
  FROM ranked
  WHERE "position" > 1
);

ALTER TABLE "tags"
ALTER COLUMN "normalized_name" SET NOT NULL;

CREATE UNIQUE INDEX "tags_userId_normalized_name_key"
ON "tags"("userId", "normalized_name");
