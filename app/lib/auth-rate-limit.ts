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

export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const key = hashRateLimitKey(rule.action, rule.identifier);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await consumeRateLimitTransaction(rule, key, new Date());
    } catch (error) {
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2;

      if (!shouldRetry) throw error;
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
