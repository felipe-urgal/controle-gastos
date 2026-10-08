import {
  consumeRateLimit,
  type RateLimitRule,
} from "@/app/lib/security/rate-limit";

type AuthenticatedRateLimitPolicy = Omit<RateLimitRule, "identifier">;

const ONE_MINUTE_MS = 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;

export const APPLICATION_RATE_LIMIT_POLICIES = {
  dataExport: {
    action: "user-data-export-user",
    maxAttempts: 10,
    windowMs: ONE_HOUR_MS,
    blockMs: ONE_HOUR_MS,
  },
  import: {
    action: "transaction-import-user",
    maxAttempts: 30,
    windowMs: FIFTEEN_MINUTES_MS,
    blockMs: FIFTEEN_MINUTES_MS,
  },
  transactionImportPreview: {
    action: "transaction-import-preview-user",
    maxAttempts: 30,
    windowMs: FIFTEEN_MINUTES_MS,
    blockMs: FIFTEEN_MINUTES_MS,
  },
  transactionImportConfirm: {
    action: "transaction-import-confirm-user",
    maxAttempts: 30,
    windowMs: FIFTEEN_MINUTES_MS,
    blockMs: FIFTEEN_MINUTES_MS,
  },
  ptaxFetch: {
    action: "exchange-rate-ptax-user",
    maxAttempts: 30,
    windowMs: FIFTEEN_MINUTES_MS,
    blockMs: FIFTEEN_MINUTES_MS,
  },
  ptaxFiscalRefresh: {
    action: "exchange-rate-ptax-fiscal-refresh-user",
    maxAttempts: 10,
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

export function consumeDataExportRateLimit(userId: string) {
  return consumeAuthenticatedRateLimit(
    APPLICATION_RATE_LIMIT_POLICIES.dataExport,
    userId,
  );
}

export function consumeImportRateLimit(userId: string) {
  return consumeAuthenticatedRateLimit(
    APPLICATION_RATE_LIMIT_POLICIES.import,
    userId,
  );
}

export function consumeTransactionImportPreviewRateLimit(userId: string) {
  return consumeAuthenticatedRateLimit(
    APPLICATION_RATE_LIMIT_POLICIES.transactionImportPreview,
    userId,
  );
}

export function consumeTransactionImportConfirmRateLimit(userId: string) {
  return consumeAuthenticatedRateLimit(
    APPLICATION_RATE_LIMIT_POLICIES.transactionImportConfirm,
    userId,
  );
}

export function consumeTransactionMutationRateLimit(userId: string) {
  return consumeAuthenticatedRateLimit(
    APPLICATION_RATE_LIMIT_POLICIES.transactionMutation,
    userId,
  );
}

export function consumePtaxFetchRateLimit(userId: string) {
  return consumeAuthenticatedRateLimit(
    APPLICATION_RATE_LIMIT_POLICIES.ptaxFetch,
    userId,
  );
}

export function consumePtaxFiscalRefreshRateLimit(userId: string) {
  return consumeAuthenticatedRateLimit(
    APPLICATION_RATE_LIMIT_POLICIES.ptaxFiscalRefresh,
    userId,
  );
}
