import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getRequestId, logEvent, withRequestId } from "@/app/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    const durationMs = Math.round(performance.now() - startedAt);
    logEvent("info", "health_check_ok", {
      requestId,
      route: "/api/health",
      status: 200,
      durationMs,
    });

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
