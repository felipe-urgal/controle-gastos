// Regras de senha compartilhadas por frontend e backend (sem dependências de
// servidor). Priorizamos comprimento; o máximo é imposto em bytes UTF-8 porque o
// bcrypt só usa os 72 primeiros bytes e nunca deve truncar silenciosamente.
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_REQUIREMENT_LABEL = `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres (máximo de ${PASSWORD_MAX_BYTES} bytes)`;

export function passwordByteLength(password: string) {
  return new TextEncoder().encode(password).length;
}

export function getPasswordRuleError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`;
  }

  if (passwordByteLength(password) > PASSWORD_MAX_BYTES) {
    return `Senha muito longa: use no máximo ${PASSWORD_MAX_BYTES} bytes (caracteres acentuados e emojis ocupam mais de 1 byte)`;
  }

  return null;
}
