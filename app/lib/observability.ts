import { NextResponse } from "next/server";

import { resolveRequestId } from "@/app/lib/request-id";

type LogLevel = "info" | "warn" | "error";
type LogValue = string | number | boolean | null | undefined;
export type LogContext = Record<string, LogValue>;

const MAX_ERROR_LENGTH = 4000;
const MIN_SECRET_LENGTH = 8;
// Segredos de operação sem formato identificável: redigidos pelo valor exato.
const SECRET_ENV_NAMES = ["CRON_SECRET", "BRAPI_TOKEN", "RESEND_API_KEY"] as const;

function redactSecrets(value: string): string {
  let redacted = value;
  for (const name of SECRET_ENV_NAMES) {
    const secret = process.env[name]?.trim();
    if (secret && secret.length >= MIN_SECRET_LENGTH) {
      redacted = redacted.split(secret).join("[REDACTED]");
    }
  }
  return redacted
    .replace(/postgres(?:ql)?:\/\/[^\s@]+@/gi, "postgresql://[REDACTED]@")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/\bre_[a-zA-Z0-9_-]{8,}\b/g, "re_[REDACTED]")
    .replace(/\bcgmcp_[a-zA-Z0-9_-]+/g, "cgmcp_[REDACTED]")
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
  return resolveRequestId(request.headers.get("x-request-id"));
}

/** Versão/deployment conhecidos pelo servidor; nunca vindos do cliente. */
export function getDeploymentInfo() {
  return {
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || undefined,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || undefined,
  };
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
    ...getDeploymentInfo(),
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


type ServerOperationLogInput = {
  event: string;
  requestId: string;
  route: string;
  status: number;
  startedAt: number;
  context?: LogContext;
  error?: unknown;
};

export function logServerOperation({
  event,
  requestId,
  route,
  status,
  startedAt,
  context = {},
  error,
}: ServerOperationLogInput) {
  const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
  const level: LogLevel =
    status >= 500 ? "error" : status >= 400 ? "warn" : "info";

  logEvent(
    level,
    event,
    {
      ...context,
      requestId,
      route,
      status,
      durationMs,
    },
    error,
  );
}

export type ProviderOutcome =
  | "success"
  | "user_error"
  | "upstream_unavailable"
  | "upstream_error";

type ProviderCallMeter = { retries: number };

/**
 * Telemetria padronizada de provider externo. Registra somente provider,
 * operation, duração, outcome e retries: nunca token, símbolo, e-mail ou
 * conteúdo. `classify` distingue erro do usuário de indisponibilidade upstream.
 */
export async function observeProviderCall<T>(
  info: { provider: string; operation: string },
  call: (meter: ProviderCallMeter) => Promise<T>,
  classify: (error: unknown) => ProviderOutcome = () => "upstream_error",
): Promise<T> {
  const startedAt = performance.now();
  const meter: ProviderCallMeter = { retries: 0 };
  const log = (outcome: ProviderOutcome) => {
    try {
      logEvent(outcome === "success" || outcome === "user_error" ? "info" : "warn", "external_provider_call", {
        provider: info.provider,
        operation: info.operation,
        outcome,
        retries: meter.retries,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      });
    } catch {
      // Telemetria nunca derruba a operação.
    }
  };

  try {
    const result = await call(meter);
    log("success");
    return result;
  } catch (error) {
    log(classify(error));
    throw error;
  }
}
