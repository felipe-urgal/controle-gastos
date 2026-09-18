import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { consumeDataExportRateLimit } from "@/app/lib/security/application-rate-limit";
import {
  buildUserDataSnapshot,
  serializeTransactionsCsv,
} from "@/app/lib/export/user-data-export";
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

    const [accounts, categories, transactions] = await prisma.$transaction(
      async (tx) =>
        Promise.all([
          tx.account.findMany({
            where: { userId },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              name: true,
              type: true,
              currency: true,
              isActive: true,
              color: true,
              icon: true,
              description: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
          tx.category.findMany({
            where: { userId },
            orderBy: [
              { position: "asc" },
              { createdAt: "asc" },
              { id: "asc" },
            ],
            select: {
              id: true,
              name: true,
              type: true,
              isActive: true,
              color: true,
              icon: true,
              description: true,
              position: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
          tx.transaction.findMany({
            where: { userId },
            orderBy: [
              { year: "asc" },
              { month: "asc" },
              { day: "asc" },
              { createdAt: "asc" },
              { id: "asc" },
            ],
            select: {
              id: true,
              amount: true,
              year: true,
              month: true,
              day: true,
              type: true,
              kind: true,
              status: true,
              description: true,
              transferId: true,
              transferRole: true,
              createdAt: true,
              updatedAt: true,
              account: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          }),
        ]),
      { isolationLevel: "RepeatableRead" }
    );

    const snapshot = {
      exportedAt,
      accounts,
      categories,
      transactions,
    };
    const snapshotDate = exportedAt.toISOString().slice(0, 10);
    const headers = exportHeaders(format, snapshotDate);

    const body =
      format === "csv"
        ? `\uFEFF${serializeTransactionsCsv(transactions)}`
        : JSON.stringify(buildUserDataSnapshot(snapshot), null, 2);

    return finish(
      new NextResponse(body, { status: 200, headers }),
      {
        format,
        result: "success",
        accountCount: accounts.length,
        categoryCount: categories.length,
        transactionCount: transactions.length,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
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
