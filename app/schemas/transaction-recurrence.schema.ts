import { z } from "zod";
import { createTransactionSchema } from "@/app/schemas/transaction.schema";
import {
  MAX_MONTHLY_OCCURRENCES,
  parseIsoLogicalDate,
} from "@/app/lib/transactions/monthly-recurrence";

const countRuleSchema = z.object({
  mode: z.literal("count"),
  occurrences: z
    .number()
    .int()
    .min(2)
    .max(MAX_MONTHLY_OCCURRENCES),
});

const endDateRuleSchema = z.object({
  mode: z.literal("endDate"),
  endDate: z
    .string()
    .refine((value) => parseIsoLogicalDate(value) !== null, {
      message: "Data final inválida",
    }),
});

export const createMonthlyRecurringTransactionSchema = z.object({
  transaction: createTransactionSchema,
  recurrence: z.discriminatedUnion("mode", [
    countRuleSchema,
    endDateRuleSchema,
  ]),
});

export type CreateMonthlyRecurringTransactionInput = z.infer<
  typeof createMonthlyRecurringTransactionSchema
>;
