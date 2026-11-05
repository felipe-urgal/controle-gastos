-- Orçamento por tag (projeto): valor e moeda andam juntos.
ALTER TABLE "tags" ADD COLUMN "budget_amount" INTEGER;
ALTER TABLE "tags" ADD COLUMN "budget_currency" CHAR(3);
ALTER TABLE "tags" ADD CONSTRAINT "tags_budget_pair_check" CHECK (("budget_amount" IS NULL) = ("budget_currency" IS NULL));
