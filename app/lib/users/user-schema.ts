import { z } from "zod";

import { AUTH_INPUT_LIMITS } from "@/app/lib/auth/auth-input";
import { passwordSchema } from "@/app/lib/auth/password-policy";

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(100)
      .optional(),

    email: z
      .string()
      .trim()
      .email("E-mail inválido")
      .max(AUTH_INPUT_LIMITS.email, "E-mail não pode exceder 120 caracteres")
      .optional(),

    currentPassword: z
      .string()
      .min(6, "Senha atual deve ter pelo menos 6 caracteres")
      .max(100, "Senha atual não pode exceder 100 caracteres")
      .optional(),

    newPassword: passwordSchema.optional(),

    showValues: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const changesSensitiveData = Boolean(data.email || data.newPassword);

    if (changesSensitiveData && !data.currentPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPassword"],
        message: "Senha atual é obrigatória para alterar e-mail ou senha",
      });
    }
  });
