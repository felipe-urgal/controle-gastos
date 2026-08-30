import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  buildUserDataSnapshot,
  serializeTransactionsCsv,
} from "@/app/lib/export/user-data-export";
import { getRequestId, logEvent, withRequestId } from "@/app/lib/observability";

type ExportFormat = "csv" | "json";

function isExportFormat(value: string | null): value is ExportFormat {
  return value === "csv" || value === "json";
}

function exportHeaders(format: ExportFormat, snapshotDate: string) {
  const extension = format === "csv" ? "csv" : "json";

  return {
    "cache-control": "private, no-store",
    "content-disposition": `attachment; filename="controle-gastos-${snapshotDate}.${extension}"`,
    "content-type":
      format === "csv"
        ? "text/csv; charset=utf-8"
        : "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  };
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const format = new URL(request.url).searchParams.get("format");

  if (!isExportFormat(format)) {
    return withRequestId(
      NextResponse.json(
        { error: { message: "Formato de exportação inválido" } },
        { status: 400, headers: { "cache-control": "private, no-store" } }
      ),
      requestId
    );
  }

  try {
    const userId = await getAuthenticatedUserId();
    const exportedAt = new Date();

    const [accounts, categories, transactions] = await Promise.all([
      prisma.account.findMany({
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
      prisma.category.findMany({
        where: { userId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
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
      prisma.transaction.findMany({
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
          status: true,
          description: true,
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
    ]);

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

    logEvent("info", "user_data_export", {
      requestId,
      format,
      result: "success",
    });

    return withRequestId(new NextResponse(body, { status: 200, headers }), requestId);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logEvent("warn", "user_data_export", {
        requestId,
        format,
        result: "unauthorized",
      });

      return withRequestId(
        NextResponse.json(
          { error: { message: "Não autenticado" } },
          { status: 401, headers: { "cache-control": "private, no-store" } }
        ),
        requestId
      );
    }

    logEvent(
      "error",
      "user_data_export",
      { requestId, format, result: "error" },
      error
    );

    return withRequestId(
      NextResponse.json(
        { error: { message: "Erro ao exportar dados" } },
        { status: 500, headers: { "cache-control": "private, no-store" } }
      ),
      requestId
    );
  }
}
