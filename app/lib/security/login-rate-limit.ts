import {
  clearRateLimit,
  consumeRateLimit,
  type RateLimitResult,
} from "@/app/lib/security/rate-limit";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const LOGIN_IP_ACTION = "login-ip";
const LOGIN_PAIR_ACTION = "login-pair";
const LOGIN_PRINCIPAL_ACTION = "login-principal";

// - ip: teto por origem (não é limpo no sucesso; mantido alto para NAT).
// - pair (IP + e-mail): limite baixo; um atacante só bloqueia a própria origem.
// - principal (e-mail global): limite alto contra brute force distribuído, sem
//   permitir que 5 erros de qualquer origem travem a vítima.
export const LOGIN_RATE_LIMIT_POLICY = {
  ipMaxAttempts: 100,
  pairMaxAttempts: 5,
  principalMaxAttempts: 50,
  windowMs: FIFTEEN_MINUTES_MS,
  blockMs: FIFTEEN_MINUTES_MS,
} as const;

function pairIdentifier(ip: string, email: string) {
  return `${ip}|${email}`;
}

export async function consumeLoginRateLimit(args: {
  ip: string;
  email: string;
}): Promise<RateLimitResult> {
  const { windowMs, blockMs } = LOGIN_RATE_LIMIT_POLICY;
  const results = await Promise.all([
    consumeRateLimit({
      action: LOGIN_IP_ACTION,
      identifier: args.ip,
      maxAttempts: LOGIN_RATE_LIMIT_POLICY.ipMaxAttempts,
      windowMs,
      blockMs,
    }),
    consumeRateLimit({
      action: LOGIN_PAIR_ACTION,
      identifier: pairIdentifier(args.ip, args.email),
      maxAttempts: LOGIN_RATE_LIMIT_POLICY.pairMaxAttempts,
      windowMs,
      blockMs,
    }),
    consumeRateLimit({
      action: LOGIN_PRINCIPAL_ACTION,
      identifier: args.email,
      maxAttempts: LOGIN_RATE_LIMIT_POLICY.principalMaxAttempts,
      windowMs,
      blockMs,
    }),
  ]);

  return results.find((result) => result.limited) ?? results[0];
}

export async function clearLoginRateLimit(args: { ip: string; email: string }) {
  await Promise.allSettled([
    clearRateLimit(LOGIN_PAIR_ACTION, pairIdentifier(args.ip, args.email)),
    clearRateLimit(LOGIN_PRINCIPAL_ACTION, args.email),
  ]);
}
