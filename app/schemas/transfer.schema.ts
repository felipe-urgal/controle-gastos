import { z } from "zod";

export const createTransferSchema = z.object({
  sourceAccountId: z.string().uuid("Conta de origem inválida"),
  destinationAccountId: z.string().uuid("Conta de destino inválida"),
  amountCents: z.number().int().positive("O valor deve ser maior que zero").max(1_000_000_000),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  description: z.string().trim().min(2).max(255),
  status: z.enum(["PENDING", "COMPLETED"]).default("COMPLETED"),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
