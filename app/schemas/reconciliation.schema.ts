import { z } from "zod";

export const updateTransactionReconciliationSchema = z.object({
  status: z.enum(["UNCLEARED", "CLEARED"]),
});

export type UpdateTransactionReconciliationInput = z.infer<
  typeof updateTransactionReconciliationSchema
>;

export const accountReconciliationPreviewSchema = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    day: z.coerce.number().int().min(1).max(31),
    statementBalance: z.coerce
      .number()
      .int("Saldo do extrato deve ser informado em centavos")
      .min(-1_000_000_000_000)
      .max(1_000_000_000_000),
  })
  .superRefine(({ year, month, day }, ctx) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;

    if (!valid) {
      ctx.addIssue({
        code: "custom",
        path: ["day"],
        message: "Data de corte inválida",
      });
    }
  });

export type AccountReconciliationPreviewInput = z.infer<
  typeof accountReconciliationPreviewSchema
>;
