import { z } from "zod";

const yearSchema = z.coerce.number().int().min(2000).max(2200);
const monthSchema = z.coerce.number().int().min(1).max(12);

export const categoryMonthlyLimitPeriodSchema = z.object({
  year: yearSchema,
  month: monthSchema,
});

export const upsertCategoryMonthlyLimitSchema = categoryMonthlyLimitPeriodSchema.extend({
  categoryId: z.string().uuid(),
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

export const removeCategoryMonthlyLimitSchema = categoryMonthlyLimitPeriodSchema.extend({
  categoryId: z.string().uuid(),
});

export type CategoryMonthlyLimitPeriodInput = z.infer<
  typeof categoryMonthlyLimitPeriodSchema
>;
export type UpsertCategoryMonthlyLimitInput = z.infer<
  typeof upsertCategoryMonthlyLimitSchema
>;
