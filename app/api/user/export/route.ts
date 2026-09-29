import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { consumeDataExportRateLimit } from "@/app/lib/security/application-rate-limit";
import { createUserDataExportStream } from "@/app/lib/export/user-data-export-stream";
import {
  getRequestId,
  logServerOperation,
  type LogContext,
  withRequestId,
} from "@/app/lib/observability";

type ExportFormat = "csv" | "json";

const PRIVATE_RESPONSE_HEADERS = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
};

function isExportFormat(value: string | null): value is ExportFormat {
  return value === "csv" || value === "json";
}

function exportRateLimitedResponse(retryAfterSeconds: number, requestId: string) {
  const response = NextResponse.json(
    {
      error: {
        code: "EXPORT_RATE_LIMITED",
        message: "Muitas exportações em pouco tempo. Tente novamente mais tarde",
      },
    },
    { status: 429, headers: PRIVATE_RESPONSE_HEADERS },
  );
  response.headers.set(
    "Retry-After",
    String(Math.max(1, Math.ceil(retryAfterSeconds))),
  );
  return withRequestId(response, requestId);
}

function exportHeaders(format: ExportFormat, snapshotDate: string) {
  const extension = format === "csv" ? "csv" : "json";

  return {
    ...PRIVATE_RESPONSE_HEADERS,
    "content-disposition": `attachment; filename="controle-gastos-${snapshotDate}.${extension}"`,
    "content-type":
      format === "csv"
        ? "text/csv; charset=utf-8"
        : "application/json; charset=utf-8",
  };
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = performance.now();
  const format = new URL(request.url).searchParams.get("format");

  function finish(
    response: NextResponse,
    context: LogContext = {},
    error?: unknown,
  ) {
    logServerOperation({
      event: "user_data_export",
      requestId,
      route: "/api/user/export",
      status: response.status,
      startedAt,
      context,
      error,
    });
    return withRequestId(response, requestId);
  }

  if (!isExportFormat(format)) {
    return finish(
      NextResponse.json(
        { error: { message: "Formato de exportação inválido" } },
        { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
      ),
      { result: "invalid_format" },
    );
  }

  try {
    const userId = await getAuthenticatedUserId();
    const limit = await consumeDataExportRateLimit(userId);
    if (limit.limited) {
      return finish(
        exportRateLimitedResponse(limit.retryAfterSeconds, requestId),
        { format, result: "rate_limited" },
      );
    }

    const exportedAt = new Date();
    const { stream, metadata } = await createUserDataExportStream({
      userId,
      format,
      exportedAt,
    });
    const snapshotDate = exportedAt.toISOString().slice(0, 10);
    const headers = exportHeaders(format, snapshotDate);

    return finish(
      new NextResponse(stream, { status: 200, headers }),
      {
        format,
        result: "success",
        accountCount: metadata.accountCount,
        categoryCount: metadata.categoryCount,
        transactionCount: metadata.transactionCount,
      },
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return finish(
        NextResponse.json(
          { error: { message: "Não autenticado" } },
          { status: 401, headers: PRIVATE_RESPONSE_HEADERS },
        ),
        { format, result: "unauthorized" },
      );
    }

    return finish(
      NextResponse.json(
        { error: { message: "Erro ao exportar dados" } },
        { status: 500, headers: PRIVATE_RESPONSE_HEADERS },
      ),
      { format, result: "error" },
      error,
    );
  }
}
