import { z } from "zod";

const yearSchema = z.coerce.number().int().min(2000).max(2100);
const monthSchema = z.coerce.number().int().min(1).max(12);
const currencySchema = z.enum(["BRL", "USD", "EUR"]).default("BRL");

export const categoryMonthlyLimitPeriodSchema = z.object({
  year: yearSchema,
  month: monthSchema,
  currency: currencySchema,
});

export const upsertCategoryMonthlyLimitSchema = categoryMonthlyLimitPeriodSchema.extend({
  categoryId: z.string().uuid("Categoria inválida"),
  amount: z
    .number()
    .int("Valor deve usar centavos inteiros")
    .nonnegative("Valor não pode ser negativo")
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


const batchLimitItemSchema = z.object({
  categoryId: z.string().uuid("Categoria inválida"),
  amount: z
    .number()
    .int("Valor deve usar centavos inteiros")
    .nonnegative("Valor não pode ser negativo")
    .max(1_000_000_000, "Valor não pode exceder 1.000.000.000"),
});

export const batchCategoryMonthlyLimitsSchema = categoryMonthlyLimitPeriodSchema.extend({
  items: z
    .array(batchLimitItemSchema)
    .min(1, "Informe ao menos uma categoria")
    .max(100, "No máximo 100 categorias por operação"),
});

export const copyCategoryMonthlyLimitsSchema = z.object({
  sourceYear: yearSchema,
  sourceMonth: monthSchema,
  targetYear: yearSchema,
  targetMonth: monthSchema,
  currency: currencySchema,
});

export type BatchCategoryMonthlyLimitsInput = z.infer<
  typeof batchCategoryMonthlyLimitsSchema
>;
export type CopyCategoryMonthlyLimitsInput = z.infer<
  typeof copyCategoryMonthlyLimitsSchema
>;
