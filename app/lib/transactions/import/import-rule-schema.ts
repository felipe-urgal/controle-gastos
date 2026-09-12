import { z } from "zod";

export const importRuleDescriptionOperatorSchema = z.enum([
  "EQUALS",
  "STARTS_WITH",
  "CONTAINS",
]);

export const importRuleTransactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

const nullableAmountCentsSchema = z.number().int().nonnegative().nullable();

export const importRuleInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    isActive: z.boolean(),
    priority: z.number().int(),
    accountId: z.string().uuid().nullable(),
    transactionType: importRuleTransactionTypeSchema,
    descriptionOperator: importRuleDescriptionOperatorSchema,
    descriptionPattern: z.string().trim().min(1).max(255),
    minAmountCents: nullableAmountCentsSchema,
    maxAmountCents: nullableAmountCentsSchema,
    categoryId: z.string().uuid(),
    normalizedDescription: z.string().trim().min(1).max(255).nullable(),
  })
  .superRefine((input, ctx) => {
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
