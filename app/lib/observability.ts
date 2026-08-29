import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

type LogLevel = "info" | "warn" | "error";
type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;

const MAX_ERROR_LENGTH = 4000;
const SAFE_REQUEST_ID = /^[a-zA-Z0-9._:-]{8,128}$/;

function redactSecrets(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s@]+@/gi, "postgresql://[REDACTED]@")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/\bre_[a-zA-Z0-9_-]{8,}\b/g, "re_[REDACTED]")
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, "[JWT_REDACTED]");
}

function sanitizeError(error: unknown) {
  if (!(error instanceof Error)) {
    return { name: "UnknownError" };
  }

  const stackFrames = error.stack
    ?.split("\n")
    .slice(1)
    .filter((line) => line.trimStart().startsWith("at "))
    .join("\n");

  return {
    name: error.name,
    stack: stackFrames
      ? redactSecrets(stackFrames).slice(0, MAX_ERROR_LENGTH)
      : undefined,
  };
}

export function getRequestId(request: Request): string {
  const incoming = request.headers.get("x-request-id")?.trim();
  return incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}

export function withRequestId<T extends NextResponse>(response: T, requestId: string): T {
  response.headers.set("x-request-id", requestId);
  return response;
}

export function logEvent(
  level: LogLevel,
  event: string,
  context: LogContext = {},
  error?: unknown
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: "controle-gastos",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    event,
    ...context,
    ...(error === undefined ? {} : { error: sanitizeError(error) }),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}
