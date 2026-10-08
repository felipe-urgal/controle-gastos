import bcrypt from "bcryptjs";
import { z } from "zod";

import { getPasswordRuleError } from "@/app/lib/auth/password-rules";

export const PASSWORD_BCRYPT_ROUNDS = 12;

export const passwordSchema = z.string().superRefine((password, ctx) => {
  const message = getPasswordRuleError(password);
  if (message) ctx.addIssue({ code: "custom", message });
});

export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return result.error.issues[0]?.message ?? "Senha inválida";
  }

  // Defesa em profundidade: nunca aceitar o que o bcrypt truncaria.
  if (bcrypt.truncates(password)) {
    return "Senha muito longa para o algoritmo de hash";
  }

  return null;
}

export function hashPassword(password: string) {
  if (bcrypt.truncates(password)) {
    throw new Error("PASSWORD_TRUNCATED_BY_BCRYPT");
  }

  return bcrypt.hash(password, PASSWORD_BCRYPT_ROUNDS);
}
