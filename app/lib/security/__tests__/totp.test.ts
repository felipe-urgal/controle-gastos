import { describe, expect, it } from "vitest";

import {
  generateTotpProvisioningUri,
  generateTotpSecret,
  TOTP_POLICY,
  verifyTotpToken,
} from "@/app/lib/security/totp";

const RFC_SHA1_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const RFC_TOKEN_AT_59_SECONDS = "287082";

describe("TOTP adapter", () => {
  it("fixes the interoperable TOTP policy explicitly", () => {
    expect(TOTP_POLICY).toEqual({
      algorithm: "sha1",
      digits: 6,
      periodSeconds: 30,
      epochToleranceSeconds: [30, 30],
      secretBytes: 20,
    });
  });

  it("generates a Base32 secret with 160 bits of entropy", () => {
    const secret = generateTotpSecret();

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  it("verifies an RFC-derived SHA-1 token and returns the accepted time-step", async () => {
    const result = await verifyTotpToken({
      secret: RFC_SHA1_SECRET,
      token: RFC_TOKEN_AT_59_SECONDS,
      at: new Date(59_000),
    });

    expect(result).toEqual({ valid: true, timeStep: BigInt(1) });
  });

  it("accepts one adjacent 30-second clock window but rejects beyond it", async () => {
    expect(
      await verifyTotpToken({
        secret: RFC_SHA1_SECRET,
        token: RFC_TOKEN_AT_59_SECONDS,
        at: new Date(89_000),
      })
    ).toEqual({ valid: true, timeStep: BigInt(1) });

    expect(
      await verifyTotpToken({
        secret: RFC_SHA1_SECRET,
        token: RFC_TOKEN_AT_59_SECONDS,
        at: new Date(120_000),
      })
    ).toEqual({ valid: false });
  });

  it("rejects a token whose accepted time-step was already consumed", async () => {
    expect(
      await verifyTotpToken({
        secret: RFC_SHA1_SECRET,
        token: RFC_TOKEN_AT_59_SECONDS,
        at: new Date(59_000),
        afterTimeStep: BigInt(1),
      })
    ).toEqual({ valid: false });
  });

  it("normalizes whitespace in pasted tokens without relaxing the six-digit format", async () => {
    expect(
      await verifyTotpToken({
        secret: RFC_SHA1_SECRET,
        token: "287 082",
        at: new Date(59_000),
      })
    ).toEqual({ valid: true, timeStep: BigInt(1) });

    expect(
      await verifyTotpToken({
        secret: RFC_SHA1_SECRET,
        token: "28-7082",
        at: new Date(59_000),
      })
    ).toEqual({ valid: false });
  });

  it("generates an otpauth URI with the same explicit policy", () => {
    const uri = generateTotpProvisioningUri({
      secret: RFC_SHA1_SECRET,
      label: "felipe@example.com",
    });
    const parsed = new URL(uri);

    expect(parsed.protocol).toBe("otpauth:");
    expect(parsed.hostname).toBe("totp");
    expect(parsed.searchParams.get("secret")).toBe(RFC_SHA1_SECRET);
    expect(parsed.searchParams.get("issuer")).toBe("Controle de Gastos");
    expect(parsed.searchParams.get("algorithm")?.toLowerCase()).toBe("sha1");
    expect(parsed.searchParams.get("digits")).toBe("6");
    expect(parsed.searchParams.get("period")).toBe("30");
  });
});
