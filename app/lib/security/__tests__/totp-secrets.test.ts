import { describe, expect, it } from "vitest";
import {
  decryptTotpSecret,
  decryptTotpSecretWithKeyring,
  encryptTotpSecret,
  encryptTotpSecretWithKeyring,
  generateRecoveryCodes,
  getTotpEncryptionKeyring,
  getTotpEnvelopeKeyVersion,
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

  it("keeps legacy v1 readable while new writes carry an explicit key version", () => {
    const keyring = {
      activeVersion: 2,
      keys: new Map([
        [1, key],
        [2, otherKey],
      ]),
    };
    const secret = "JBSWY3DPEHPK3PXP";
    const legacy = encryptTotpSecret(secret, key);
    const rotated = encryptTotpSecretWithKeyring(secret, keyring);

    expect(getTotpEnvelopeKeyVersion(legacy)).toBe(1);
    expect(getTotpEnvelopeKeyVersion(rotated)).toBe(2);
    expect(rotated).toMatch(/^v2\.2\.[^.]+\.[^.]+\.[^.]+$/);
    expect(decryptTotpSecretWithKeyring(legacy, keyring)).toBe(secret);
    expect(decryptTotpSecretWithKeyring(rotated, keyring)).toBe(secret);

    const afterOldKeyRemoval = {
      activeVersion: 2,
      keys: new Map([[2, otherKey]]),
    };
    expect(decryptTotpSecretWithKeyring(rotated, afterOldKeyRemoval)).toBe(secret);
    expect(() =>
      decryptTotpSecretWithKeyring(legacy, afterOldKeyRemoval),
    ).toThrow("TOTP_ENCRYPTION_KEY_VERSION_NOT_CONFIGURED");
  });

  it("parses an active key plus previous decrypt-only versions from env", () => {
    const keyring = getTotpEncryptionKeyring({
      TOTP_ENCRYPTION_KEY: "22".repeat(32),
      TOTP_ENCRYPTION_KEY_VERSION: "2",
      TOTP_ENCRYPTION_PREVIOUS_KEYS: `1:${"11".repeat(32)}`,
    });

    expect(keyring.activeVersion).toBe(2);
    expect(keyring.keys.get(1)).toEqual(key);
    expect(keyring.keys.get(2)).toEqual(otherKey);
  });

  it("defaults the active key version to 1 for backwards-compatible rollout", () => {
    const keyring = getTotpEncryptionKeyring({
      TOTP_ENCRYPTION_KEY: "11".repeat(32),
    });

    expect(keyring.activeVersion).toBe(1);
    expect(keyring.keys.get(1)).toEqual(key);
  });

  it("rejects invalid or duplicate keyring versions without exposing key material", () => {
    expect(() =>
      getTotpEncryptionKeyring({
        TOTP_ENCRYPTION_KEY: "11".repeat(32),
        TOTP_ENCRYPTION_KEY_VERSION: "0",
      }),
    ).toThrow("inteiro positivo");

    expect(() =>
      getTotpEncryptionKeyring({
        TOTP_ENCRYPTION_KEY: "22".repeat(32),
        TOTP_ENCRYPTION_KEY_VERSION: "2",
        TOTP_ENCRYPTION_PREVIOUS_KEYS: `2:${"11".repeat(32)}`,
      }),
    ).toThrow("Versão de chave TOTP duplicada");
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
