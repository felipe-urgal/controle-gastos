import { z } from "zod";

export const merchantNameSchema = z
  .string()
  .trim()
  .min(2, "Nome deve ter pelo menos 2 caracteres")
  .max(120, "Nome não pode exceder 120 caracteres");

export const createMerchantSchema = z.object({
  name: merchantNameSchema,
  isActive: z.boolean().optional().default(true),
});

export const updateMerchantSchema = z
  .object({
    name: merchantNameSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Nenhum dado fornecido para atualização");
