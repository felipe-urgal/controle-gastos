CREATE TYPE "ImportedDocumentStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'ARCHIVED');

ALTER TABLE "payroll_documents"
ADD COLUMN "lifecycle_status" "ImportedDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "supersedes_id" TEXT,
ADD COLUMN "superseded_at" TIMESTAMP(3),
ADD COLUMN "archived_at" TIMESTAMP(3);

ALTER TABLE "annual_employment_income_statements"
ADD COLUMN "lifecycle_status" "ImportedDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "supersedes_id" TEXT,
ADD COLUMN "superseded_at" TIMESTAMP(3),
ADD COLUMN "archived_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "payroll_documents_supersedes_id_key"
ON "payroll_documents"("supersedes_id");

CREATE UNIQUE INDEX "annual_employment_income_statements_supersedes_id_key"
ON "annual_employment_income_statements"("supersedes_id");

CREATE INDEX "payroll_documents_userId_lifecycle_status_year_month_idx"
ON "payroll_documents"("userId", "lifecycle_status", "year", "month");

CREATE INDEX "annual_employment_income_statements_userId_lifecycle_status_calendar_year_idx"
ON "annual_employment_income_statements"("userId", "lifecycle_status", "calendar_year");

ALTER TABLE "payroll_documents"
ADD CONSTRAINT "payroll_documents_supersedes_id_fkey"
FOREIGN KEY ("supersedes_id") REFERENCES "payroll_documents"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "annual_employment_income_statements"
ADD CONSTRAINT "annual_employment_income_statements_supersedes_id_fkey"
FOREIGN KEY ("supersedes_id") REFERENCES "annual_employment_income_statements"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_documents"
ADD CONSTRAINT "payroll_documents_lifecycle_shape_check"
CHECK (
  (
    "lifecycle_status" = 'ACTIVE'
    AND "superseded_at" IS NULL
    AND "archived_at" IS NULL
  )
  OR
  (
    "lifecycle_status" = 'SUPERSEDED'
    AND "superseded_at" IS NOT NULL
    AND "archived_at" IS NULL
  )
  OR
  (
    "lifecycle_status" = 'ARCHIVED'
    AND "superseded_at" IS NULL
    AND "archived_at" IS NOT NULL
  )
);

ALTER TABLE "annual_employment_income_statements"
ADD CONSTRAINT "annual_employment_income_statements_lifecycle_shape_check"
CHECK (
  (
    "lifecycle_status" = 'ACTIVE'
    AND "superseded_at" IS NULL
    AND "archived_at" IS NULL
  )
  OR
  (
    "lifecycle_status" = 'SUPERSEDED'
    AND "superseded_at" IS NOT NULL
    AND "archived_at" IS NULL
  )
  OR
  (
    "lifecycle_status" = 'ARCHIVED'
    AND "superseded_at" IS NULL
    AND "archived_at" IS NOT NULL
  )
);
