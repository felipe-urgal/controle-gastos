/** Única leitura de `JWT_SECRET`: todo token assinado pelo app usa este segredo, e a falta dele é erro de configuração. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET_NOT_CONFIGURED");
  return secret;
}
