import { z } from "zod";
import { createTransactionSchema } from "@/app/schemas/transaction.schema";
import { MAX_MONTHLY_OCCURRENCES } from "@/app/lib/transactions/monthly-recurrence";

export const createInstallmentTransactionSchema = z.object({
  transaction: createTransactionSchema.extend({
    type: z.literal("EXPENSE"),
  }),
  installmentCount: z
    .number()
    .int()
    .min(2)
    .max(MAX_MONTHLY_OCCURRENCES),
});

export type CreateInstallmentTransactionInput = z.infer<
  typeof createInstallmentTransactionSchema
>;
