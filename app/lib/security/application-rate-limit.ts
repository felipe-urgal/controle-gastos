import {
  consumeRateLimit,
  type RateLimitRule,
} from "@/app/lib/security/rate-limit";

type AuthenticatedRateLimitPolicy = Omit<RateLimitRule, "identifier">;

const ONE_MINUTE_MS = 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS;

export const APPLICATION_RATE_LIMIT_POLICIES = {
  import: {
    action: "transaction-import-user",
    maxAttempts: 30,
    windowMs: FIFTEEN_MINUTES_MS,
    blockMs: FIFTEEN_MINUTES_MS,
  },
  transactionMutation: {
    action: "transaction-mutation-user",
    maxAttempts: 120,
    windowMs: ONE_MINUTE_MS,
    blockMs: ONE_MINUTE_MS,
  },
} as const satisfies Record<string, AuthenticatedRateLimitPolicy>;

function consumeAuthenticatedRateLimit(
  policy: AuthenticatedRateLimitPolicy,
  userId: string,
) {
  return consumeRateLimit({
    ...policy,
    identifier: userId,
  });
}

export function consumeImportRateLimit(userId: string) {
  return consumeAuthenticatedRateLimit(
    APPLICATION_RATE_LIMIT_POLICIES.import,
    userId,
  );
}

export function consumeTransactionMutationRateLimit(userId: string) {
  return consumeAuthenticatedRateLimit(
    APPLICATION_RATE_LIMIT_POLICIES.transactionMutation,
    userId,
  );
}
