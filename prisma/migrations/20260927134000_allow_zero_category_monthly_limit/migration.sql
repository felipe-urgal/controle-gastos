ALTER TABLE "category_monthly_limits"
DROP CONSTRAINT "category_monthly_limits_amount_check";

ALTER TABLE "category_monthly_limits"
ADD CONSTRAINT "category_monthly_limits_amount_check"
CHECK ("amount" >= 0);
