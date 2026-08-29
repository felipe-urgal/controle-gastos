import { z } from "zod";

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
      .optional(),

    currentPassword: z
      .string()
      .min(6, "Senha atual deve ter pelo menos 6 caracteres")
      .max(100, "Senha atual não pode exceder 100 caracteres")
      .optional(),

    newPassword: z
      .string()
      .min(6, "Senha deve ter pelo menos 6 caracteres")
      .max(100, "Senha não pode exceder 100 caracteres")
      .optional(),

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
