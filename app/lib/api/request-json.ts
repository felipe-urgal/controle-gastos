import { HttpError } from "@/app/lib/http-error";

export const DEFAULT_JSON_BODY_LIMIT_BYTES = 64 * 1024;

type ParseJsonBodyOptions = {
  maxBytes?: number;
};

function payloadTooLarge() {
  return new HttpError(
    "Payload JSON muito grande",
    413,
    "PAYLOAD_TOO_LARGE",
  );
}

function declaredContentLength(request: Request) {
  const raw = request.headers.get("content-length");
  if (!raw) return null;

  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

async function readBodyWithinLimit(request: Request, maxBytes: number) {
  const contentLength = declaredContentLength(request);
  if (contentLength !== null && contentLength > maxBytes) {
    throw payloadTooLarge();
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        throw payloadTooLarge();
      }

      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

export async function parseJsonBody(
  request: Request,
  options: ParseJsonBodyOptions = {},
): Promise<unknown> {
  const maxBytes = options.maxBytes ?? DEFAULT_JSON_BODY_LIMIT_BYTES;

  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("INVALID_JSON_BODY_LIMIT");
  }

  try {
    return JSON.parse(await readBodyWithinLimit(request, maxBytes));
  } catch (error) {
    if (error instanceof HttpError) throw error;

    if (error instanceof SyntaxError) {
      throw new HttpError("JSON inválido", 400, "INVALID_JSON");
    }

    throw error;
  }
}
