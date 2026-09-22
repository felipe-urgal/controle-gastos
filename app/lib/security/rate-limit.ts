import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";

export type RateLimitRule = {
  action: string;
  identifier: string;
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
};

export type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds: number;
};

const GC_PROBABILITY = 0.01;
const GC_RETENTION_MS = 24 * 60 * 60 * 1000;
const RETRYABLE_POSTGRES_TRANSACTION_CODES = new Set(["40001", "40P01"]);
const MAX_TRANSACTION_ATTEMPTS = 8;
const RETRY_BACKOFF_MS = [10, 20, 40, 80, 160, 250, 250] as const;

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return firstForwardedIp || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashRateLimitKey(action: string, identifier: string) {
  return crypto
    .createHash("sha256")
    .update(`${action}:${identifier}`)
    .digest("hex");
}

async function purgeStaleRateLimits(now: Date) {
  const staleBefore = new Date(now.getTime() - GC_RETENTION_MS);

  await prisma.authRateLimit.deleteMany({
    where: {
      updatedAt: { lt: staleBefore },
      OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }],
    },
  });
}

async function maybePurgeStaleRateLimits(now: Date) {
  if (Math.random() >= GC_PROBABILITY) return;

  try {
    await purgeStaleRateLimits(now);
  } catch {
    // Cleanup is best-effort and must never weaken or disable rate limiting.
  }
}

async function consumeRateLimitTransaction(
  rule: RateLimitRule,
  key: string,
  now: Date
): Promise<RateLimitResult> {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.authRateLimit.findUnique({
        where: {
          key_action: {
            key,
            action: rule.action,
          },
        },
      });

      if (existing?.blockedUntil && existing.blockedUntil > now) {
        return {
          limited: true,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((existing.blockedUntil.getTime() - now.getTime()) / 1000)
          ),
        };
      }

      const windowExpired =
        !existing || now.getTime() - existing.windowStart.getTime() >= rule.windowMs;

      if (windowExpired) {
        await tx.authRateLimit.upsert({
          where: {
            key_action: {
              key,
              action: rule.action,
            },
          },
          create: {
            key,
            action: rule.action,
            attempts: 1,
            windowStart: now,
          },
          update: {
            attempts: 1,
            windowStart: now,
            blockedUntil: null,
          },
        });

        return { limited: false, retryAfterSeconds: 0 };
      }

      const nextAttempts = existing.attempts + 1;
      const shouldBlock = nextAttempts > rule.maxAttempts;
      const blockedUntil = shouldBlock
        ? new Date(now.getTime() + rule.blockMs)
        : null;

      await tx.authRateLimit.update({
        where: { id: existing.id },
        data: {
          attempts: nextAttempts,
          blockedUntil,
        },
      });

      return {
        limited: shouldBlock,
        retryAfterSeconds: shouldBlock
          ? Math.max(1, Math.ceil(rule.blockMs / 1000))
          : 0,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

function hasRetryablePostgresTransactionCode(error: unknown) {
  let current = error;
  const seen = new Set<object>();

  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "object" || current === null) return false;
    if (seen.has(current)) return false;
    seen.add(current);

    const candidate = current as {
      originalCode?: unknown;
      cause?: unknown;
    };

    if (
      typeof candidate.originalCode === "string" &&
      RETRYABLE_POSTGRES_TRANSACTION_CODES.has(candidate.originalCode)
    ) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}

function isRetryableTransactionConflict(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return true;
  }

  return hasRetryablePostgresTransactionCode(error);
}

export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const key = hashRateLimitKey(rule.action, rule.identifier);
  const now = new Date();
  await maybePurgeStaleRateLimits(now);

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await consumeRateLimitTransaction(rule, key, new Date());
    } catch (error) {
      const shouldRetry =
        attempt < MAX_TRANSACTION_ATTEMPTS - 1 &&
        isRetryableTransactionConflict(error);

      if (!shouldRetry) throw error;

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_BACKOFF_MS[attempt]),
      );
    }
  }

  throw new Error("RATE_LIMIT_TRANSACTION_FAILED");
}

export async function clearRateLimit(action: string, identifier: string) {
  const key = hashRateLimitKey(action, identifier);

  await prisma.authRateLimit.deleteMany({
    where: { key, action },
  });
}
