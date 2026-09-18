import crypto from "node:crypto";

const LEGACY_ENVELOPE_VERSION = "v1";
const KEYED_ENVELOPE_VERSION = "v2";
export const LEGACY_TOTP_KEY_VERSION = 1;
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;
const RECOVERY_CODE_BYTES = 10;

export type TotpEncryptionKey = Buffer;

export type TotpEncryptionKeyring = {
  activeVersion: number;
  keys: ReadonlyMap<number, TotpEncryptionKey>;
};

function parseKeyVersion(value: string, name: string) {
  const version = Number(value);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`${name} deve ser um inteiro positivo`);
  }
  return version;
}

export function parseTotpEncryptionKey(value: string): TotpEncryptionKey {
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("TOTP_ENCRYPTION_KEY deve conter 32 bytes em hexadecimal");
  }

  return Buffer.from(value, "hex");
}

export function getTotpEncryptionKeyring(
  env: Readonly<Record<string, string | undefined>> = process.env,
): TotpEncryptionKeyring {
  const activeRaw = env.TOTP_ENCRYPTION_KEY;
  if (!activeRaw) {
    throw new Error("TOTP_ENCRYPTION_KEY_NOT_CONFIGURED");
  }

  const activeVersion = parseKeyVersion(
    env.TOTP_ENCRYPTION_KEY_VERSION ?? String(LEGACY_TOTP_KEY_VERSION),
    "TOTP_ENCRYPTION_KEY_VERSION",
  );
  const keys = new Map<number, TotpEncryptionKey>([
    [activeVersion, parseTotpEncryptionKey(activeRaw)],
  ]);

  const previousRaw = env.TOTP_ENCRYPTION_PREVIOUS_KEYS?.trim();
  if (previousRaw) {
    for (const entry of previousRaw.split(",").map((item) => item.trim()).filter(Boolean)) {
      const separator = entry.indexOf(":");
      if (separator <= 0 || separator === entry.length - 1) {
        throw new Error(
          "TOTP_ENCRYPTION_PREVIOUS_KEYS deve usar version:hex separado por vírgulas",
        );
      }

      const version = parseKeyVersion(
        entry.slice(0, separator),
        "Versão anterior TOTP",
      );
      if (keys.has(version)) {
        throw new Error("Versão de chave TOTP duplicada");
      }

      keys.set(
        version,
        parseTotpEncryptionKey(entry.slice(separator + 1)),
      );
    }
  }

  return { activeVersion, keys };
}

function aadForEnvelope(formatVersion: string, keyVersion?: number) {
  return Buffer.from(
    keyVersion === undefined
      ? `controle-gastos:totp-secret:${formatVersion}`
      : `controle-gastos:totp-secret:${formatVersion}:key:${keyVersion}`,
    "utf8",
  );
}

function decodeEnvelope(envelope: string) {
  const parts = envelope.split(".");

  if (parts.length === 4 && parts[0] === LEGACY_ENVELOPE_VERSION) {
    const [, ivEncoded, ciphertextEncoded, tagEncoded] = parts;
    return {
      keyVersion: LEGACY_TOTP_KEY_VERSION,
      ivEncoded,
      ciphertextEncoded,
      tagEncoded,
      aad: aadForEnvelope(LEGACY_ENVELOPE_VERSION),
    };
  }

  if (parts.length === 5 && parts[0] === KEYED_ENVELOPE_VERSION) {
    const [, keyVersionRaw, ivEncoded, ciphertextEncoded, tagEncoded] = parts;
    const keyVersion = parseKeyVersion(keyVersionRaw, "Versão da chave TOTP");
    return {
      keyVersion,
      ivEncoded,
      ciphertextEncoded,
      tagEncoded,
      aad: aadForEnvelope(KEYED_ENVELOPE_VERSION, keyVersion),
    };
  }

  throw new Error("Envelope TOTP inválido");
}

export function getTotpEnvelopeKeyVersion(envelope: string) {
  return decodeEnvelope(envelope).keyVersion;
}

export function encryptTotpSecret(
  secret: string,
  key: TotpEncryptionKey,
  keyVersion?: number,
) {
  if (!secret.trim()) {
    throw new Error("Segredo TOTP vazio");
  }
  if (key.length !== 32) {
    throw new Error("Chave TOTP inválida");
  }

  if (keyVersion !== undefined) {
    parseKeyVersion(String(keyVersion), "Versão da chave TOTP");
  }

  const iv = crypto.randomBytes(AES_GCM_IV_BYTES);
  const formatVersion =
    keyVersion === undefined ? LEGACY_ENVELOPE_VERSION : KEYED_ENVELOPE_VERSION;
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AES_GCM_TAG_BYTES,
  });
  cipher.setAAD(aadForEnvelope(formatVersion, keyVersion));

  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return (
    keyVersion === undefined
      ? [
          LEGACY_ENVELOPE_VERSION,
          iv.toString("base64url"),
          ciphertext.toString("base64url"),
          tag.toString("base64url"),
        ]
      : [
          KEYED_ENVELOPE_VERSION,
          String(keyVersion),
          iv.toString("base64url"),
          ciphertext.toString("base64url"),
          tag.toString("base64url"),
        ]
  ).join(".");
}

export function encryptTotpSecretWithKeyring(
  secret: string,
  keyring: TotpEncryptionKeyring = getTotpEncryptionKeyring(),
) {
  const activeKey = keyring.keys.get(keyring.activeVersion);
  if (!activeKey) {
    throw new Error("TOTP_ENCRYPTION_ACTIVE_KEY_NOT_CONFIGURED");
  }

  return encryptTotpSecret(secret, activeKey, keyring.activeVersion);
}

export function decryptTotpSecret(envelope: string, key: TotpEncryptionKey) {
  if (key.length !== 32) {
    throw new Error("Chave TOTP inválida");
  }

  const decoded = decodeEnvelope(envelope);
  const iv = Buffer.from(decoded.ivEncoded, "base64url");
  const ciphertext = Buffer.from(decoded.ciphertextEncoded, "base64url");
  const tag = Buffer.from(decoded.tagEncoded, "base64url");

  if (iv.length !== AES_GCM_IV_BYTES || tag.length !== AES_GCM_TAG_BYTES) {
    throw new Error("Envelope TOTP inválido");
  }

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
      authTagLength: AES_GCM_TAG_BYTES,
    });
    decipher.setAAD(decoded.aad);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Envelope TOTP inválido");
  }
}

export function decryptTotpSecretWithKeyring(
  envelope: string,
  keyring: TotpEncryptionKeyring = getTotpEncryptionKeyring(),
) {
  const keyVersion = getTotpEnvelopeKeyVersion(envelope);
  const key = keyring.keys.get(keyVersion);
  if (!key) {
    throw new Error("TOTP_ENCRYPTION_KEY_VERSION_NOT_CONFIGURED");
  }

  return decryptTotpSecret(envelope, key);
}

export function isTotpEncryptionConfigurationError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error.message.startsWith("TOTP_ENCRYPTION_") ||
    error.message.startsWith("Versão anterior TOTP") ||
    error.message === "Versão de chave TOTP duplicada"
  );
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
