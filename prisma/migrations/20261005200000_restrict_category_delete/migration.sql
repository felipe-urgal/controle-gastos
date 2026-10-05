-- Categorias não podem apagar ou desassociar silenciosamente dados financeiros/configurações.
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_categoryId_fkey";
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "category_monthly_limits" DROP CONSTRAINT "category_monthly_limits_categoryId_fkey";
ALTER TABLE "category_monthly_limits"
ADD CONSTRAINT "category_monthly_limits_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transaction_import_rules" DROP CONSTRAINT "transaction_import_rules_categoryId_fkey";
ALTER TABLE "transaction_import_rules"
ADD CONSTRAINT "transaction_import_rules_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transaction_templates" DROP CONSTRAINT "transaction_templates_categoryId_fkey";
ALTER TABLE "transaction_templates"
ADD CONSTRAINT "transaction_templates_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
