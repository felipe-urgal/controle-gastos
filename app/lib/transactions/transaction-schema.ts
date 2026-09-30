import { z } from "zod";

import { validateTransactionAllocationSet } from "@/app/lib/transactions/transaction-allocations";

export function isValidTransactionDate(
  year: number,
  month: number,
  day: number,
) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const transactionBaseSchema = z.object({
  categoryId: z.string().uuid("Categoria inválida"),

  allocations: z.array(z.object({
    categoryId: z.string().uuid("Categoria da divisão inválida"),
    amount: z.number().int("Valor da divisão deve usar centavos inteiros").positive("Valor da divisão deve ser maior que zero"),
  })).max(20, "Uma transação pode ter no máximo 20 divisões").optional(),

  tagIds: z
    .array(z.string().uuid("Tag inválida"))
    .max(10, "Uma transação pode ter no máximo 10 tags")
    .refine((items) => new Set(items).size === items.length, "Tags duplicadas não são permitidas")
    .optional(),

  amount: z
    .number()
    .int("Valor deve usar centavos inteiros")
    .positive("Valor deve ser maior que zero")
    .max(1_000_000_000, "Valor não pode exceder 1.000.000.000"),

  description: z
    .string()
    .trim()
    .min(2, "Descrição deve ter pelo menos 2 caracteres")
    .max(100, "Descrição não pode exceder 100 caracteres"),

  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),

  accountId: z
    .string()
    .uuid("Conta inválida"),

  status: z.enum(["COMPLETED", "PENDING", "CANCELLED"]).default("COMPLETED"),

  type: z.enum(["INCOME", "EXPENSE"]),
});

export const createTransactionSchema = transactionBaseSchema.superRefine(
  ({ year, month, day, amount, categoryId, allocations }, ctx) => {
    if (!isValidTransactionDate(year, month, day)) {
      ctx.addIssue({
        code: "custom",
        path: ["day"],
        message: "Data inválida",
      });
    }

    const allocationError = validateTransactionAllocationSet({ amount, categoryId, allocations });
    if (allocationError) {
      ctx.addIssue({ code: "custom", path: ["allocations"], message: allocationError });
    }
  },
);

export const updateTransactionSchema = transactionBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    if (
      data.year !== undefined &&
      data.month !== undefined &&
      data.day !== undefined &&
      !isValidTransactionDate(data.year, data.month, data.day)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["day"],
        message: "Data inválida",
      });
    }
  });
