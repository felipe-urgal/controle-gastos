CREATE TYPE "PayrollDocumentType" AS ENUM ('PAYROLL_ADVANCE', 'MONTHLY_PAYSLIP');

CREATE TYPE "PayrollPaymentType" AS ENUM ('ADVANCE', 'REGULAR', 'THIRTEENTH', 'VACATION', 'PLR', 'OTHER');

CREATE TABLE "payroll_documents" (
  "id" TEXT NOT NULL,
  "document_type" "PayrollDocumentType" NOT NULL,
  "payment_type" "PayrollPaymentType" NOT NULL,
  "employer_name" VARCHAR(160) NOT NULL,
  "employer_cnpj" VARCHAR(18) NOT NULL,
  "employee_name" VARCHAR(160),
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "salary_base_cents" INTEGER,
  "gross_income_cents" INTEGER,
  "total_earnings_cents" INTEGER,
  "total_deductions_cents" INTEGER,
  "net_paid_cents" INTEGER,
  "inss_cents" INTEGER,
  "irrf_cents" INTEGER,
  "irrf_base_cents" INTEGER,
  "fgts_base_cents" INTEGER,
  "fgts_amount_cents" INTEGER,
  "earnings" JSONB NOT NULL,
  "deductions" JSONB NOT NULL,
  "bank_metadata" JSONB,
  "warnings" JSONB NOT NULL,
  "import_fingerprint" CHAR(64) NOT NULL,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payroll_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_documents_userId_import_fingerprint_key"
ON "payroll_documents"("userId", "import_fingerprint");

CREATE INDEX "payroll_documents_userId_year_month_document_type_idx"
ON "payroll_documents"("userId", "year", "month", "document_type");

CREATE INDEX "payroll_documents_userId_employer_cnpj_year_month_idx"
ON "payroll_documents"("userId", "employer_cnpj", "year", "month");

ALTER TABLE "payroll_documents"
ADD CONSTRAINT "payroll_documents_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
