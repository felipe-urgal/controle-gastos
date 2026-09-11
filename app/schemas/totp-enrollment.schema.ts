import { z } from "zod";

export const startTotpEnrollmentSchema = z.object({
  currentPassword: z
    .string()
    .min(6, "Senha atual deve ter pelo menos 6 caracteres")
    .max(100, "Senha atual não pode exceder 100 caracteres"),
});

export const confirmTotpEnrollmentSchema = z.object({
  enrollmentToken: z
    .string()
    .trim()
    .min(1, "Token de enrollment é obrigatório"),
  token: z
    .string()
    .trim()
    .min(1, "Código TOTP é obrigatório")
    .max(16, "Código TOTP inválido"),
});
