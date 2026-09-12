import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { clearRateLimit } from "@/app/lib/auth/auth-rate-limit";
import {
  clearMfaLoginPrincipalRateLimit,
  consumeMfaLoginRateLimit,
  MFA_LOGIN_RATE_LIMIT_POLICY,
} from "@/app/lib/security/mfa-rate-limit";

const IP_ACTION = "mfa-login-ip";
const PRINCIPAL_ACTION = "mfa-login-principal";
const createdIdentifiers: Array<{ action: string; identifier: string }> = [];

function track(action: string, identifier: string) {
  createdIdentifiers.push({ action, identifier });
}

afterEach(async () => {
  await Promise.all(
    createdIdentifiers.splice(0).map(({ action, identifier }) =>
      clearRateLimit(action, identifier)
    )
  );
});

describe("MFA login rate limit", () => {
  it("blocks the principal after five shared second-factor attempts", async () => {
    const userId = randomUUID();
    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    track(PRINCIPAL_ACTION, userId);
    track(IP_ACTION, ip);

    expect(MFA_LOGIN_RATE_LIMIT_POLICY.principalMaxAttempts).toBe(5);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await consumeMfaLoginRateLimit({ userId, ip })).limited).toBe(false);
    }

    const blocked = await consumeMfaLoginRateLimit({ userId, ip });
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("clears only the principal bucket after a successful MFA verification", async () => {
    const userId = randomUUID();
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    track(PRINCIPAL_ACTION, userId);
    track(IP_ACTION, ip);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await consumeMfaLoginRateLimit({ userId, ip });
    }

    await clearMfaLoginPrincipalRateLimit(userId);

    expect((await consumeMfaLoginRateLimit({ userId, ip })).limited).toBe(false);
  });

  it("rejects empty MFA identifiers before touching the shared limiter", async () => {
    await expect(
      consumeMfaLoginRateLimit({ userId: "", ip: "198.51.100.1" })
    ).rejects.toThrow("Usuário MFA inválido");

    await expect(
      consumeMfaLoginRateLimit({ userId: randomUUID(), ip: "   " })
    ).rejects.toThrow("IP MFA inválido");
  });
});
