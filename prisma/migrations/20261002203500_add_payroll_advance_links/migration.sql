CREATE TYPE "PayrollAdvanceLinkStatus" AS ENUM ('MATCHED', 'PENDING');

CREATE TABLE "payroll_advance_links" (
  "id" TEXT NOT NULL,
  "status" "PayrollAdvanceLinkStatus" NOT NULL,
  "compensation_cents" INTEGER,
  "reason" VARCHAR(240),
  "evidence" JSONB NOT NULL,
  "userId" TEXT NOT NULL,
  "advance_document_id" TEXT NOT NULL,
  "regular_document_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payroll_advance_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_advance_links_advance_document_id_key"
ON "payroll_advance_links"("advance_document_id");

CREATE INDEX "payroll_advance_links_userId_status_idx"
ON "payroll_advance_links"("userId", "status");

CREATE INDEX "payroll_advance_links_userId_regular_document_id_idx"
ON "payroll_advance_links"("userId", "regular_document_id");

ALTER TABLE "payroll_advance_links"
ADD CONSTRAINT "payroll_advance_links_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_advance_links"
ADD CONSTRAINT "payroll_advance_links_advance_document_id_fkey"
FOREIGN KEY ("advance_document_id") REFERENCES "payroll_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_advance_links"
ADD CONSTRAINT "payroll_advance_links_regular_document_id_fkey"
FOREIGN KEY ("regular_document_id") REFERENCES "payroll_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
