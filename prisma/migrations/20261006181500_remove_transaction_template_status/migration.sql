UPDATE "transaction_templates"
SET "status" = 'COMPLETED'
WHERE "status" <> 'COMPLETED';

ALTER TABLE "transaction_templates"
DROP COLUMN "status";
