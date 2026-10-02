CREATE TABLE "annual_employment_income_statements" (
  "id" TEXT NOT NULL,
  "calendar_year" INTEGER NOT NULL,
  "tax_exercise" INTEGER NOT NULL,
  "payer_name" VARCHAR(180) NOT NULL,
  "payer_tax_id" VARCHAR(18) NOT NULL,
  "beneficiary_name" VARCHAR(180),
  "beneficiary_tax_id" VARCHAR(18),
  "income_nature" VARCHAR(240),
  "taxable_income_cents" INTEGER,
  "official_pension_cents" INTEGER,
  "complementary_pension_cents" INTEGER,
  "alimony_cents" INTEGER,
  "irrf_cents" INTEGER,
  "thirteenth_salary_cents" INTEGER,
  "thirteenth_irrf_cents" INTEGER,
  "exempt_income" JSONB NOT NULL,
  "exclusive_taxation" JSONB NOT NULL,
  "accumulated_income" JSONB NOT NULL,
  "notes" JSONB NOT NULL,
  "warnings" JSONB NOT NULL,
  "import_fingerprint" CHAR(64) NOT NULL,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "annual_employment_income_statements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "annual_employment_income_statements_userId_import_fingerprint_key"
ON "annual_employment_income_statements"("userId", "import_fingerprint");

CREATE INDEX "annual_employment_income_statements_userId_calendar_year_payer_tax_id_idx"
ON "annual_employment_income_statements"("userId", "calendar_year", "payer_tax_id");

ALTER TABLE "annual_employment_income_statements"
ADD CONSTRAINT "annual_employment_income_statements_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
