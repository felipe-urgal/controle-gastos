import { z } from "zod";

import {
  isSupportedRecurrenceFrequencyInterval,
  MAX_RECURRENCE_OCCURRENCES,
} from "@/app/lib/transactions/logical-recurrence";
import { parseIsoLogicalDate } from "@/app/lib/transactions/monthly-recurrence";
import { createTransactionSchema } from "@/app/schemas/transaction.schema";

const frequencySchema = z.enum(["WEEKLY", "MONTHLY", "YEARLY"]);

const recurrenceBase = {
  frequency: frequencySchema,
  interval: z.number().int().positive(),
};

const countRuleSchema = z.object({
  ...recurrenceBase,
  mode: z.literal("count"),
  occurrences: z
    .number()
    .int()
    .min(2)
    .max(MAX_RECURRENCE_OCCURRENCES),
});

const endDateRuleSchema = z.object({
  ...recurrenceBase,
  mode: z.literal("endDate"),
  endDate: z
    .string()
    .refine((value) => parseIsoLogicalDate(value) !== null, {
      message: "Data final inválida",
    }),
});

export const flexibleRecurrenceRuleSchema = z
  .discriminatedUnion("mode", [countRuleSchema, endDateRuleSchema])
  .superRefine((rule, ctx) => {
    if (!isSupportedRecurrenceFrequencyInterval(rule.frequency, rule.interval)) {
      ctx.addIssue({
        code: "custom",
        path: ["interval"],
        message: "Combinação de frequência e intervalo fora do MVP",
      });
    }
  });

export const createFlexibleRecurringTransactionSchema = z.object({
  transaction: createTransactionSchema,
  recurrence: flexibleRecurrenceRuleSchema,
});

export type CreateFlexibleRecurringTransactionInput = z.infer<
  typeof createFlexibleRecurringTransactionSchema
>;
