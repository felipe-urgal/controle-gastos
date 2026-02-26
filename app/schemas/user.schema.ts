// user.schema.ts
import { z } from "zod";

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100)
    .optional(),

  email: z
    .string()
    .email("E-mail inválido")
    .optional(),

  newPassword: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .optional(),

  showValues: z.boolean().optional(),
});