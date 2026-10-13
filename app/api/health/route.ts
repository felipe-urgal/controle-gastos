import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getRequestId, logEvent, withRequestId } from "@/app/lib/observability";

export const dynamic = "force-dynamic";

// Readiness lenta equivale a indisponibilidade: falha rápido, sem cancelar
// queries da aplicação (o timeout só abandona a espera deste check).
export const HEALTH_DB_TIMEOUT_MS = 2_000;

class HealthTimeoutError extends Error {
  constructor() {
    super("HEALTH_DB_TIMEOUT");
    this.name = "HealthTimeoutError";
  }
}

async function checkDatabase() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HealthTimeoutError()), HEALTH_DB_TIMEOUT_MS);
  });
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const startedAt = performance.now();

  try {
    await checkDatabase();

    return withRequestId(
      NextResponse.json(
        {
          status: "ok",
          checks: {
            application: "ok",
            database: "ok",
          },
          requestId,
          timestamp: new Date().toISOString(),
        },
        {
          status: 200,
          headers: { "cache-control": "no-store" },
        }
      ),
      requestId
    );
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    logEvent(
      "error",
      "health_check_failed",
      {
        requestId,
        route: "/api/health",
        status: 503,
        durationMs,
        reason: error instanceof HealthTimeoutError ? "timeout" : "error",
      },
      error
    );

    return withRequestId(
      NextResponse.json(
        {
          status: "degraded",
          checks: {
            application: "ok",
            database: "unavailable",
          },
          requestId,
          timestamp: new Date().toISOString(),
        },
        {
          status: 503,
          headers: { "cache-control": "no-store" },
        }
      ),
      requestId
    );
  }
}
