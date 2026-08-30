import {
  getCategoryMonthlyLimits,
  removeCategoryMonthlyLimit,
  upsertCategoryMonthlyLimit,
} from "@/app/lib/category-limits/category-monthly-limits";

export const GET = getCategoryMonthlyLimits;
export const PUT = upsertCategoryMonthlyLimit;
export const DELETE = removeCategoryMonthlyLimit;
