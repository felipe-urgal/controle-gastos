import { z } from "zod";

export const createAccountSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(50, "Nome não pode exceder 50 caracteres"),

  type: z.enum(["CREDIT_DEBIT", "INVESTMENT"]),

  currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),

  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Formato de cor inválido (#RRGGBB)")
    .optional(),

  icon: z.string().optional(),

  description: z.string().max(255).nullable(),

  isActive: z.boolean().default(true),
});

export const updateAccountSchema = createAccountSchema.partial();
