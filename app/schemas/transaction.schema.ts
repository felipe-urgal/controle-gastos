import { z } from "zod";

export const createTransactionSchema = z.object({
  categoryId: z.string().uuid("Categoria inválida"),

  amount: z
    .number()
    .positive("Valor deve ser maior que zero")
    .max(1_000_000_000, "Valor não pode exceder 1.000.000.000"),

  description: z
    .string()
    .trim()
    .min(2, "Descrição deve ter pelo menos 2 caracteres")
    .max(100, "Descrição não pode exceder 100 caracteres"),

  year: z.number().min(2000).max(2100),
  month: z.number().min(1).max(12),
  day: z.number().min(1).max(31),

  accountId: z
    .string()
    .uuid("Conta inválida"),

  status: z.enum(["COMPLETED", "PENDING", "CANCELLED"]).default("COMPLETED"),

  type: z.enum(["INCOME", "EXPENSE"]),
});

export const updateTransactionSchema = createTransactionSchema.partial();