CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "transactions_description_trgm_idx"
ON "transactions"
USING GIN ("description" gin_trgm_ops);
