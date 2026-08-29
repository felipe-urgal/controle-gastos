import { NextResponse } from "next/server";
import { getRequestId, logEvent, withRequestId } from "@/app/lib/observability";

const MAX_BODY_BYTES = 1024;
const SAFE_DIGEST = /^[a-zA-Z0-9._:-]{1,128}$/;

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return withRequestId(new NextResponse(null, { status: 413 }), requestId);
  }

  let digest: string | undefined;

  try {
    const body = (await request.json()) as { digest?: unknown };
    if (typeof body.digest === "string" && SAFE_DIGEST.test(body.digest)) {
      digest = body.digest;
    }
  } catch {
    // The endpoint intentionally accepts only a tiny optional digest and never logs payloads.
  }

  logEvent("error", "frontend_unhandled_error", {
    requestId,
    route: "client",
    ...(digest ? { digest } : {}),
  });

  return withRequestId(new NextResponse(null, { status: 204 }), requestId);
}
