import { z } from "zod";
import { TRANSACTION_MAX_AMOUNT_CENTS } from "@/app/lib/transactions/transaction-field-contract";

export const importRuleDescriptionOperatorSchema = z.enum([
  "EQUALS",
  "STARTS_WITH",
  "CONTAINS",
]);

export const importRuleTransactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const PRISMA_INT_MIN = -2_147_483_648;
export const PRISMA_INT_MAX = 2_147_483_647;

const nullableAmountCentsSchema = z
  .number()
  .int()
  .nonnegative()
  .max(TRANSACTION_MAX_AMOUNT_CENTS)
  .nullable();

export const importRuleInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    isActive: z.boolean(),
    priority: z.number().int().min(PRISMA_INT_MIN).max(PRISMA_INT_MAX),
    accountId: z.string().uuid().nullable(),
    transactionType: importRuleTransactionTypeSchema,
    descriptionOperator: importRuleDescriptionOperatorSchema,
    descriptionPattern: z.string().trim().min(1).max(255),
    minAmountCents: nullableAmountCentsSchema,
    maxAmountCents: nullableAmountCentsSchema,
    categoryId: z.string().uuid(),
  })
  .superRefine((input, ctx) => {
    if (
      input.accountId === null &&
      (input.minAmountCents !== null || input.maxAmountCents !== null)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["accountId"],
        message: "Regras com faixa de valor exigem uma conta específica",
      });
    }

    if (
      input.minAmountCents !== null &&
      input.maxAmountCents !== null &&
      input.minAmountCents > input.maxAmountCents
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maxAmountCents"],
        message: "Valor máximo deve ser maior ou igual ao mínimo",
      });
    }
  });

export type ImportRuleInput = z.infer<typeof importRuleInputSchema>;
