import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { accountReconciliationPreviewSchema } from "@/app/schemas/reconciliation.schema";

type PreviewRow = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  kind: "NORMAL" | "TRANSFER";
  description: string;
  reconciliationStatus: "UNCLEARED" | "CLEARED" | "RECONCILED";
  year: number;
  month: number;
  day: number;
};

function signedAmount(row: Pick<PreviewRow, "amount" | "type">) {
  return row.type === "INCOME" ? row.amount : -row.amount;
}

export function calculateReconciliationPreview(
  rows: PreviewRow[],
  statementBalance: number,
) {
  const realizedBalance = rows.reduce((total, row) => total + signedAmount(row), 0);
  const clearedBalance = rows.reduce(
    (total, row) =>
      row.reconciliationStatus === "UNCLEARED"
        ? total
        : total + signedAmount(row),
    0,
  );

  return {
    statementBalance,
    realizedBalance,
    clearedBalance,
    difference: statementBalance - clearedBalance,
    unclearedItems: rows.filter(
      (row) => row.reconciliationStatus === "UNCLEARED",
    ),
    clearedItems: rows.filter(
      (row) => row.reconciliationStatus === "CLEARED",
    ),
    reconciledCount: rows.filter(
      (row) => row.reconciliationStatus === "RECONCILED",
    ).length,
  };
}

export async function getAccountReconciliationPreview(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!context) {
      return failure("Conta não encontrada", 404);
    }

    const { id } = await context.params;
    const searchParams = Object.fromEntries(new URL(request.url).searchParams);
    const input = accountReconciliationPreviewSchema.parse(searchParams);

    const account = await prisma.account.findFirst({
      where: { id, userId },
      select: { id: true, name: true, currency: true },
    });

    if (!account) {
      return failure("Conta não encontrada", 404);
    }

    const cutoff = [
      { year: { lt: input.year } },
      { year: input.year, month: { lt: input.month } },
      {
        year: input.year,
        month: input.month,
        day: { lte: input.day },
      },
    ];

    const [rows, latestReconciled] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          accountId: account.id,
          status: "COMPLETED",
          OR: cutoff,
        },
        select: {
          id: true,
          amount: true,
          type: true,
          kind: true,
          description: true,
          reconciliationStatus: true,
          year: true,
          month: true,
          day: true,
        },
        orderBy: [
          { year: "asc" },
          { month: "asc" },
          { day: "asc" },
          { createdAt: "asc" },
        ],
      }),
      prisma.transaction.findFirst({
        where: {
          userId,
          accountId: account.id,
          status: "COMPLETED",
          reconciliationStatus: "RECONCILED",
          reconciledAt: { not: null },
        },
        select: { reconciledAt: true },
        orderBy: { reconciledAt: "desc" },
      }),
    ]);

    let latestReconciliation: null | {
      reconciledAt: string;
      transactionCount: number;
      cutoff: null | { year: number; month: number; day: number };
      statementBalance: number | null;
    } = null;

    if (latestReconciled?.reconciledAt) {
      const batchReconciledAt = latestReconciled.reconciledAt;
      const [transactionCount, audit] = await Promise.all([
        prisma.transaction.count({
          where: {
            userId,
            accountId: account.id,
            reconciliationStatus: "RECONCILED",
            reconciledAt: batchReconciledAt,
          },
        }),
        prisma.accountReconciliationEvent.findUnique({
          where: {
            accountId_batchReconciledAt_action: {
              accountId: account.id,
              batchReconciledAt,
              action: "CONFIRMED",
            },
          },
          select: {
            cutoffYear: true,
            cutoffMonth: true,
            cutoffDay: true,
            statementBalance: true,
          },
        }),
      ]);

      latestReconciliation = {
        reconciledAt: batchReconciledAt.toISOString(),
        transactionCount,
        cutoff:
          audit?.cutoffYear && audit.cutoffMonth && audit.cutoffDay
            ? {
                year: audit.cutoffYear,
                month: audit.cutoffMonth,
                day: audit.cutoffDay,
              }
            : null,
        statementBalance: audit?.statementBalance ?? null,
      };
    }

    return success({
      account,
      cutoff: {
        year: input.year,
        month: input.month,
        day: input.day,
      },
      ...calculateReconciliationPreview(rows, input.statementBalance),
      latestReconciliation,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }

    return failure("Erro ao calcular reconciliação da conta", 500);
  }
}
