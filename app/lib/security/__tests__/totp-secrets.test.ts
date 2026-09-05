import { describe, expect, it } from "vitest";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
  parseTotpEncryptionKey,
  verifyRecoveryCode,
} from "@/app/lib/security/totp-secrets";

const key = parseTotpEncryptionKey("11".repeat(32));
const otherKey = parseTotpEncryptionKey("22".repeat(32));

describe("TOTP secret protection", () => {
  it("requires an explicit 32-byte hexadecimal application key", () => {
    expect(parseTotpEncryptionKey("ab".repeat(32))).toHaveLength(32);
    expect(() => parseTotpEncryptionKey("short")).toThrow();
    expect(() => parseTotpEncryptionKey("zz".repeat(32))).toThrow();
  });

  it("round-trips a secret through a versioned AES-GCM envelope", () => {
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP", key);

    expect(encrypted).toMatch(/^v1\.[^.]+\.[^.]+\.[^.]+$/);
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptTotpSecret(encrypted, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("uses a fresh IV for each encryption of the same secret", () => {
    const first = encryptTotpSecret("JBSWY3DPEHPK3PXP", key);
    const second = encryptTotpSecret("JBSWY3DPEHPK3PXP", key);

    expect(first).not.toBe(second);
    expect(decryptTotpSecret(first, key)).toBe("JBSWY3DPEHPK3PXP");
    expect(decryptTotpSecret(second, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("rejects wrong keys and tampered authentication tags", () => {
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP", key);
    expect(() => decryptTotpSecret(encrypted, otherKey)).toThrow(
      "Envelope TOTP inválido"
    );

    const parts = encrypted.split(".");
    parts[3] = Buffer.from("tampered-tag").toString("base64url");
    expect(() => decryptTotpSecret(parts.join("."), key)).toThrow(
      "Envelope TOTP inválido"
    );
  });
});

describe("TOTP recovery codes", () => {
  it("generates unique high-entropy codes in a human-readable format", () => {
    const codes = generateRecoveryCodes(10);

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[A-F0-9]{4}(?:-[A-F0-9]{4}){4}$/);
    }
  });

  it("normalizes separators and verifies only the hash", () => {
    const code = "ABCD-EF01-2345-6789-ABCD";
    const hash = hashRecoveryCode(code);

    expect(normalizeRecoveryCode(" abcd ef01-2345 6789 abcd ")).toBe(
      "ABCDEF0123456789ABCD"
    );
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("ABCD");
    expect(verifyRecoveryCode("abcd ef01 2345 6789 abcd", hash)).toBe(true);
    expect(verifyRecoveryCode("ABCD-EF01-2345-6789-ABCE", hash)).toBe(false);
  });

  it("fails closed for malformed recovery codes and hashes", () => {
    expect(() => hashRecoveryCode("1234")).toThrow();
    expect(verifyRecoveryCode("1234", "0".repeat(64))).toBe(false);
    expect(
      verifyRecoveryCode("ABCD-EF01-2345-6789-ABCD", "not-a-hash")
    ).toBe(false);
  });

  it("bounds recovery-code batch size", () => {
    expect(() => generateRecoveryCodes(0)).toThrow();
    expect(() => generateRecoveryCodes(21)).toThrow();
  });
});
