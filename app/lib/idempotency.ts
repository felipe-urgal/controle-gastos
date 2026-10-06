import { createHash } from "node:crypto";

import { HttpError } from "@/app/lib/http-error";

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeIdempotencyKey(value: string | null) {
  if (value === null) return null;

  const normalized = value.trim();
  if (!normalized || normalized.length > 128) {
    throw new HttpError(
      "Chave de idempotência inválida",
      400,
      "IDEMPOTENCY_KEY_INVALID",
    );
  }

  return normalized;
}

export function requireIdempotencyKey(request: Request) {
  const key = normalizeIdempotencyKey(request.headers.get("Idempotency-Key"));
  if (!key) {
    throw new HttpError(
      "Idempotency-Key obrigatório",
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
    );
  }
  return key;
}

export function hashIdempotencyKey(key: string) {
  return sha256(key);
}

export function hashIdempotencyPayload(payload: unknown) {
  return sha256(JSON.stringify(payload));
}

export function assertIdempotencyPayload(
  persistedRequestHash: string | null,
  requestHash: string,
) {
  if (persistedRequestHash !== requestHash) {
    throw new HttpError(
      "Chave de idempotência já utilizada com outro payload",
      409,
      "IDEMPOTENCY_PAYLOAD_CONFLICT",
    );
  }
}
