import crypto, { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AUTH_INPUT_LIMITS } from "@/app/lib/auth/auth-input";
import { prisma } from "@/app/lib/prisma";
import {
  clearRateLimit,
  consumeRateLimit,
} from "@/app/lib/security/rate-limit";
import { updateUserSchema } from "@/app/lib/users/user-schema";

const cleanupRateLimits: Array<{ action: string; identifier: string }> = [];
const cleanupRowIds: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();

  await Promise.all([
    ...cleanupRateLimits.splice(0).map(({ action, identifier }) =>
      clearRateLimit(action, identifier),
    ),
    prisma.authRateLimit.deleteMany({
      where: { id: { in: cleanupRowIds.splice(0) } },
    }),
  ]);
});

describe("senior review hardening regressions", () => {
  it("keeps the HTTP email limit aligned with users.email VARCHAR(120)", () => {
    expect(AUTH_INPUT_LIMITS.email).toBe(120);
  });

  it("rejects a weak new password in the authenticated profile schema", () => {
    const result = updateUserSchema.safeParse({
      currentPassword: "SenhaAtual123",
      newPassword: "aaaaaa",
    });

    expect(result.success).toBe(false);
  });

  it("opportunistically purges expired inactive limiter buckets", async () => {
    const staleId = randomUUID();
    const staleAction = "stale-review-bucket";
    const staleKey = crypto.createHash("sha256").update(randomUUID()).digest("hex");
    const staleAt = new Date(Date.now() - 48 * 60 * 60 * 1000);

    await prisma.authRateLimit.create({
      data: {
        id: staleId,
        key: staleKey,
        action: staleAction,
        attempts: 1,
        windowStart: staleAt,
        blockedUntil: null,
        createdAt: staleAt,
        updatedAt: staleAt,
      },
    });
    cleanupRowIds.push(staleId);

    vi.spyOn(Math, "random").mockReturnValue(0);

    const action = "review-gc-trigger";
    const identifier = randomUUID();
    cleanupRateLimits.push({ action, identifier });

    await consumeRateLimit({
      action,
      identifier,
      maxAttempts: 5,
      windowMs: 60_000,
      blockMs: 60_000,
    });

    expect(
      await prisma.authRateLimit.count({ where: { id: staleId } }),
    ).toBe(0);
  });
});
