import { AUTH_INPUT_LIMITS } from "@/app/lib/auth/auth-input";

// Regras de nome/e-mail compartilhadas por frontend e backend.
export const NAME_MIN_LENGTH = 2;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email);
}

export function getEmailError(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (!email) return "E-mail é obrigatório";
  if (email.length > AUTH_INPUT_LIMITS.email) return "E-mail é muito longo";
  if (!isValidEmail(email)) return "E-mail inválido";
  return null;
}

export function getNameError(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Nome é obrigatório";
  if (name.length < NAME_MIN_LENGTH) {
    return `Nome deve ter pelo menos ${NAME_MIN_LENGTH} caracteres`;
  }
  if (name.length > AUTH_INPUT_LIMITS.name) {
    return `Nome não pode exceder ${AUTH_INPUT_LIMITS.name} caracteres`;
  }
  return null;
}
