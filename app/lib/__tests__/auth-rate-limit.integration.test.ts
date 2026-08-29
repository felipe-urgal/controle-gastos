import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/app/lib/prisma";
import {
  clearRateLimit,
  consumeRateLimit,
} from "@/app/lib/auth-rate-limit";

const createdIdentifiers: Array<{ action: string; identifier: string }> = [];

describe("auth rate limiter", () => {
  afterEach(async () => {
    await Promise.all(
      createdIdentifiers.splice(0).map(({ action, identifier }) =>
        clearRateLimit(action, identifier)
      )
    );
  });

  it("blocks after the configured number of attempts and can be cleared", async () => {
    const action = "test-login";
    const identifier = randomUUID();
    createdIdentifiers.push({ action, identifier });

    const rule = {
      action,
      identifier,
      maxAttempts: 2,
      windowMs: 60_000,
      blockMs: 60_000,
    };

    expect((await consumeRateLimit(rule)).limited).toBe(false);
    expect((await consumeRateLimit(rule)).limited).toBe(false);

    const blocked = await consumeRateLimit(rule);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    await clearRateLimit(action, identifier);
    expect((await consumeRateLimit(rule)).limited).toBe(false);
  });

  it("never stores the raw identifier", async () => {
    const action = "test-privacy";
    const identifier = `user-${randomUUID()}@example.com`;
    createdIdentifiers.push({ action, identifier });

    await consumeRateLimit({
      action,
      identifier,
      maxAttempts: 2,
      windowMs: 60_000,
      blockMs: 60_000,
    });

    const row = await prisma.authRateLimit.findFirst({
      where: { action },
      orderBy: { createdAt: "desc" },
    });

    expect(row).not.toBeNull();
    expect(row?.key).toMatch(/^[a-f0-9]{64}$/);
    expect(row?.key).not.toContain(identifier);
  });
});
