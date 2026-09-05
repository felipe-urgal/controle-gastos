import crypto from "node:crypto";

const ENVELOPE_VERSION = "v1";
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;
const TOTP_AAD = Buffer.from("controle-gastos:totp-secret:v1", "utf8");
const RECOVERY_CODE_BYTES = 10;

export type TotpEncryptionKey = Buffer;

export function parseTotpEncryptionKey(value: string): TotpEncryptionKey {
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("TOTP_ENCRYPTION_KEY deve conter 32 bytes em hexadecimal");
  }

  return Buffer.from(value, "hex");
}

export function encryptTotpSecret(secret: string, key: TotpEncryptionKey) {
  if (!secret.trim()) {
    throw new Error("Segredo TOTP vazio");
  }
  if (key.length !== 32) {
    throw new Error("Chave TOTP inválida");
  }

  const iv = crypto.randomBytes(AES_GCM_IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AES_GCM_TAG_BYTES,
  });
  cipher.setAAD(TOTP_AAD);

  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function decryptTotpSecret(envelope: string, key: TotpEncryptionKey) {
  if (key.length !== 32) {
    throw new Error("Chave TOTP inválida");
  }

  const parts = envelope.split(".");
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new Error("Envelope TOTP inválido");
  }

  const [, ivEncoded, ciphertextEncoded, tagEncoded] = parts;
  const iv = Buffer.from(ivEncoded, "base64url");
  const ciphertext = Buffer.from(ciphertextEncoded, "base64url");
  const tag = Buffer.from(tagEncoded, "base64url");

  if (iv.length !== AES_GCM_IV_BYTES || tag.length !== AES_GCM_TAG_BYTES) {
    throw new Error("Envelope TOTP inválido");
  }

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
      authTagLength: AES_GCM_TAG_BYTES,
    });
    decipher.setAAD(TOTP_AAD);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Envelope TOTP inválido");
  }
}

export function normalizeRecoveryCode(value: string) {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

export function generateRecoveryCode() {
  const compact = crypto.randomBytes(RECOVERY_CODE_BYTES).toString("hex").toUpperCase();
  return compact.match(/.{1,4}/g)!.join("-");
}

export function generateRecoveryCodes(count = 10) {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error("Quantidade de recovery codes inválida");
  }

  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateRecoveryCode());
  }

  return [...codes];
}

export function hashRecoveryCode(code: string) {
  const normalized = normalizeRecoveryCode(code);
  if (!/^[A-F0-9]{20}$/.test(normalized)) {
    throw new Error("Recovery code inválido");
  }

  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function verifyRecoveryCode(code: string, expectedHash: string) {
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) {
    return false;
  }

  let actualHash: string;
  try {
    actualHash = hashRecoveryCode(code);
  } catch {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(actualHash, "hex"),
    Buffer.from(expectedHash, "hex")
  );
}
