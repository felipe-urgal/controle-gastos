import { z } from "zod";

const transferAmountSchema = z
  .number()
  .int()
  .positive("O valor deve ser maior que zero")
  .max(1_000_000_000);

const transferStatusSchema = z.enum(["PENDING", "COMPLETED", "CANCELLED"]);

export const createTransferSchema = z.object({
  sourceAccountId: z.string().uuid("Conta de origem inválida"),
  destinationAccountId: z.string().uuid("Conta de destino inválida"),
  amountCents: transferAmountSchema,
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  description: z.string().trim().min(2).max(255),
  status: z.enum(["PENDING", "COMPLETED"]).default("COMPLETED"),
});

export const updateTransferSchema = z
  .object({
    amountCents: transferAmountSchema.optional(),
    year: z.number().int().min(2000).max(2100).optional(),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
    description: z.string().trim().min(2).max(255).optional(),
    status: transferStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type UpdateTransferInput = z.infer<typeof updateTransferSchema>;
