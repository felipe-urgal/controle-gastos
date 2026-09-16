import bcrypt from "bcryptjs";
import { z } from "zod";

import { AUTH_INPUT_LIMITS } from "@/app/lib/auth/auth-input";

export const PASSWORD_BCRYPT_ROUNDS = 12;

export const passwordSchema = z
  .string()
  .min(6, "Senha deve ter pelo menos 6 caracteres")
  .max(AUTH_INPUT_LIMITS.password, "Senha não pode exceder 100 caracteres")
  .regex(/[A-Z]/, "Senha deve conter ao menos uma letra maiúscula")
  .regex(/[0-9]/, "Senha deve conter ao menos um número");

export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : (result.error.issues[0]?.message ?? "Senha inválida");
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_BCRYPT_ROUNDS);
}
