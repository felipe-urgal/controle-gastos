import { describe, expect, it } from "vitest";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "@/app/lib/password-reset-token";

describe("password reset token", () => {
  it("stores only a deterministic SHA-256 hash", () => {
    const { token, tokenHash } = generatePasswordResetToken();

    expect(token).toHaveLength(64);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).not.toBe(token);
    expect(hashPasswordResetToken(token)).toBe(tokenHash);
  });
});
