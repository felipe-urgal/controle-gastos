import { z } from "zod";

const accountBaseSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(50, "Nome não pode exceder 50 caracteres"),

  type: z.enum(["CREDIT_DEBIT", "INVESTMENT"]),

  currency: z.enum(["BRL", "USD", "EUR"]),

  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Formato de cor inválido (#RRGGBB)")
    .optional(),

  icon: z.string().optional(),

  description: z.string().max(255).nullable(),

  isActive: z.boolean(),
});

export const createAccountSchema = accountBaseSchema.extend({
  currency: accountBaseSchema.shape.currency.default("BRL"),
  isActive: accountBaseSchema.shape.isActive.default(true),
});

export const updateAccountSchema = accountBaseSchema.partial();
