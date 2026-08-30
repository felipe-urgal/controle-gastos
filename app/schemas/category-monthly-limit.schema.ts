import { z } from "zod";

const yearSchema = z.coerce.number().int().min(2000).max(2100);
const monthSchema = z.coerce.number().int().min(1).max(12);

export const categoryMonthlyLimitPeriodSchema = z.object({
  year: yearSchema,
  month: monthSchema,
});

export const upsertCategoryMonthlyLimitSchema = categoryMonthlyLimitPeriodSchema.extend({
  categoryId: z.string().uuid("Categoria inválida"),
  amount: z
    .number()
    .int("Valor deve usar centavos inteiros")
    .positive("Valor deve ser maior que zero")
    .max(1_000_000_000, "Valor não pode exceder 1.000.000.000"),
});

export const removeCategoryMonthlyLimitSchema = categoryMonthlyLimitPeriodSchema.extend({
  categoryId: z.string().uuid("Categoria inválida"),
});

export type CategoryMonthlyLimitPeriodInput = z.infer<
  typeof categoryMonthlyLimitPeriodSchema
>;
export type UpsertCategoryMonthlyLimitInput = z.infer<
  typeof upsertCategoryMonthlyLimitSchema
>;
