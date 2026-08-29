import crypto from "node:crypto";
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

export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const now = new Date();
  const key = hashRateLimitKey(rule.action, rule.identifier);

  return prisma.$transaction(async (tx) => {
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
  });
}

export async function clearRateLimit(action: string, identifier: string) {
  const key = hashRateLimitKey(action, identifier);

  await prisma.authRateLimit.deleteMany({
    where: { key, action },
  });
}
