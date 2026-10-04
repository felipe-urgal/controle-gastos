CREATE TABLE "annual_financial_tax_statements" (
    "id" TEXT NOT NULL,
    "calendar_year" INTEGER NOT NULL,
    "source_institution" VARCHAR(180) NOT NULL,
    "source_institution_cnpj" VARCHAR(18),
    "document_type" VARCHAR(80) NOT NULL,
    "positions" JSONB NOT NULL,
    "incomes" JSONB NOT NULL,
    "tax_withholdings" JSONB NOT NULL,
    "notes" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "import_fingerprint" CHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annual_financial_tax_statements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "annual_financial_tax_statements_userId_import_fingerprint_key"
ON "annual_financial_tax_statements"("userId", "import_fingerprint");

CREATE INDEX "annual_financial_tax_statements_userId_calendar_year_source_institution_cnpj_idx"
ON "annual_financial_tax_statements"("userId", "calendar_year", "source_institution_cnpj");

ALTER TABLE "annual_financial_tax_statements"
ADD CONSTRAINT "annual_financial_tax_statements_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
