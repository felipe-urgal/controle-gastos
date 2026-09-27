import { z } from "zod";

import { parseIsoLogicalDate } from "@/app/lib/date/logical-date";

const MAX_CENTS = 2_147_483_647;

const nullableTargetDate = z
  .string()
  .nullable()
  .optional()
  .refine(
    (value) => value === null || value === undefined || parseIsoLogicalDate(value) !== null,
    "Data alvo inválida",
  );

export const createFinancialGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome não pode exceder 100 caracteres"),
  targetAmount: z
    .number()
    .int("Valor alvo deve usar centavos inteiros")
    .positive("Valor alvo deve ser maior que zero")
    .max(MAX_CENTS, "Valor alvo excede o limite suportado"),
  currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
  targetDate: nullableTargetDate,
  description: z.string().trim().max(500).nullable().optional(),
  accountId: z.string().uuid("Conta inválida").nullable().optional(),
});

export const updateFinancialGoalSchema = createFinancialGoalSchema
  .partial()
  .extend({
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  });

export const financialGoalEntrySchema = z.object({
  type: z.enum(["CONTRIBUTION", "WITHDRAWAL"]),
  amount: z
    .number()
    .int("Valor deve usar centavos inteiros")
    .positive("Valor deve ser maior que zero")
    .max(MAX_CENTS, "Valor excede o limite suportado"),
  description: z.string().trim().max(255).nullable().optional(),
});

export type CreateFinancialGoalInput = z.infer<typeof createFinancialGoalSchema>;
export type UpdateFinancialGoalInput = z.infer<typeof updateFinancialGoalSchema>;
export type FinancialGoalEntryInput = z.infer<typeof financialGoalEntrySchema>;
