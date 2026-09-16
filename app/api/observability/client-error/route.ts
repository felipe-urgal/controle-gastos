import { NextResponse } from "next/server";
import { getRequestId, logEvent, withRequestId } from "@/app/lib/observability";

const MAX_BODY_BYTES = 1024;
const SAFE_DIGEST = /^[a-zA-Z0-9._:-]{1,128}$/;

class BodyTooLargeError extends Error {}

async function readLimitedBody(request: Request) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        try {
          await reader.cancel();
        } finally {
          throw new BodyTooLargeError();
        }
      }

      text += decoder.decode(value, { stream: true });
    }

    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength =
    contentLengthHeader === null ? null : Number(contentLengthHeader);

  if (
    contentLength !== null &&
    Number.isFinite(contentLength) &&
    contentLength > MAX_BODY_BYTES
  ) {
    return withRequestId(new NextResponse(null, { status: 413 }), requestId);
  }

  let digest: string | undefined;

  try {
    const rawBody = await readLimitedBody(request);
    const body: unknown = rawBody ? JSON.parse(rawBody) : null;
    const payload =
      body !== null && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : null;
    const candidate = payload?.digest;

    if (typeof candidate === "string" && SAFE_DIGEST.test(candidate)) {
      digest = candidate;
    }
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return withRequestId(new NextResponse(null, { status: 413 }), requestId);
    }
    // Intentionally ignore malformed/empty payloads; raw body is never logged.
  }

  logEvent("error", "frontend_unhandled_error", {
    requestId,
    route: "client",
    ...(digest ? { digest } : {}),
  });

  return withRequestId(new NextResponse(null, { status: 204 }), requestId);
}
