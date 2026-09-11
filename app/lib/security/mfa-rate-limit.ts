import {
  clearRateLimit,
  consumeRateLimit,
  type RateLimitResult,
} from "@/app/lib/auth-rate-limit";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const MFA_LOGIN_IP_ACTION = "mfa-login-ip";
const MFA_LOGIN_PRINCIPAL_ACTION = "mfa-login-principal";

export const MFA_LOGIN_RATE_LIMIT_POLICY = {
  ipMaxAttempts: 30,
  principalMaxAttempts: 5,
  windowMs: FIFTEEN_MINUTES_MS,
  blockMs: FIFTEEN_MINUTES_MS,
} as const;

function assertIdentifier(value: string, field: string) {
  if (!value.trim()) {
    throw new Error(`${field} inválido`);
  }
}

export async function consumeMfaLoginRateLimit(args: {
  userId: string;
  ip: string;
}): Promise<RateLimitResult> {
  assertIdentifier(args.userId, "Usuário MFA");
  assertIdentifier(args.ip, "IP MFA");

  const [ipLimit, principalLimit] = await Promise.all([
    consumeRateLimit({
      action: MFA_LOGIN_IP_ACTION,
      identifier: args.ip,
      maxAttempts: MFA_LOGIN_RATE_LIMIT_POLICY.ipMaxAttempts,
      windowMs: MFA_LOGIN_RATE_LIMIT_POLICY.windowMs,
      blockMs: MFA_LOGIN_RATE_LIMIT_POLICY.blockMs,
    }),
    consumeRateLimit({
      action: MFA_LOGIN_PRINCIPAL_ACTION,
      identifier: args.userId,
      maxAttempts: MFA_LOGIN_RATE_LIMIT_POLICY.principalMaxAttempts,
      windowMs: MFA_LOGIN_RATE_LIMIT_POLICY.windowMs,
      blockMs: MFA_LOGIN_RATE_LIMIT_POLICY.blockMs,
    }),
  ]);

  return ipLimit.limited ? ipLimit : principalLimit;
}

export async function clearMfaLoginPrincipalRateLimit(userId: string) {
  assertIdentifier(userId, "Usuário MFA");
  await clearRateLimit(MFA_LOGIN_PRINCIPAL_ACTION, userId);
}
