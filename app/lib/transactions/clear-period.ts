import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { lockCreditCardAccount } from "@/app/lib/cards/credit-card-purchase-guards";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { assertMonthsOpen } from "@/app/lib/monthly-closing/month-lock";
import { prisma } from "@/app/lib/prisma";
import { consumeTransactionMutationRateLimit } from "@/app/lib/security/application-rate-limit";
import { periodRangeSchema, periodRangeWhere, type PeriodRange } from "@/app/lib/transactions/period-range";
import { syncTransactionSeriesMetadata } from "@/app/lib/transactions/transaction-series-metadata";

const clearSchema = periodRangeSchema.extend({
  expectedCount: z.number().int().min(0),
});

export type ClearPeriodPreview = {
  /** Total de linhas de transação que serão removidas. */
  deletable: number;
  breakdown: {
    normal: number;
    /** Transferências inteiras (cada uma remove as duas pernas). */
    transfers: number;
    cardPayments: number;
    /** Dentro de `normal`: já conciliadas (o estado de conciliação é perdido). */
    reconciled: number;
  };
  /** Saldo inicial de conta é âncora do saldo e nunca é removido. */
  kept: { openingBalance: number };
};

type Period = PeriodRange;

async function classifyPeriod(
  tx: Prisma.TransactionClient,
  userId: string,
  period: Period,
  options: { lockCards: boolean },
) {
  if (period.accountId) {
    const account = await tx.account.findFirst({
      where: { id: period.accountId, userId },
      select: { id: true },
    });
    if (!account) throw new HttpError("Conta não encontrada", 404);
  }

  const rows = await tx.transaction.findMany({
    where: {
      userId,
      ...periodRangeWhere(period),
      ...(period.accountId ? { accountId: period.accountId } : {}),
    },
    select: {
      id: true,
      kind: true,
      reconciliationStatus: true,
      seriesId: true,
      transferId: true,
      account: { select: { id: true, type: true } },
    },
  });

  const normal = rows.filter((row) => row.kind === "NORMAL");
  const cardPaymentRows = rows.filter((row) => row.kind === "CARD_PAYMENT");
  const openingBalance = rows.filter((row) => row.kind === "OPENING_BALANCE").length;
  const orphanTransferLegIds = rows
    .filter((row) => row.kind === "TRANSFER" && !row.transferId)
    .map((row) => row.id);
  const transferIds = [
    ...new Set(rows.flatMap((row) => (row.kind === "TRANSFER" && row.transferId ? [row.transferId] : []))),
  ];

  // Uma transferência é atômica: as duas pernas saem juntas, mesmo que uma esteja fora do filtro de conta.
  const transferLegIds = transferIds.length
    ? (
        await tx.transaction.findMany({
          where: { userId, kind: "TRANSFER", transferId: { in: transferIds } },
          select: { id: true },
        })
      ).map((leg) => leg.id)
    : [];

  const cardPayments = cardPaymentRows.length
    ? await tx.creditCardPayment.findMany({
        where: { userId, sourceTransactionId: { in: cardPaymentRows.map((row) => row.id) } },
        select: { id: true, cardAccountId: true, sourceTransactionId: true },
      })
    : [];

  if (options.lockCards) {
    const cardIds = new Set([
      ...normal.filter((row) => row.account.type === "CREDIT_CARD").map((row) => row.account.id),
      ...cardPayments.map((payment) => payment.cardAccountId),
    ]);
    for (const cardId of [...cardIds].sort()) {
      await lockCreditCardAccount(tx, userId, cardId);
    }
  }

  return {
    normalIds: normal.map((row) => row.id),
    seriesIds: [...new Set(normal.flatMap((row) => (row.seriesId ? [row.seriesId] : [])))],
    reconciled: normal.filter((row) => row.reconciliationStatus === "RECONCILED").length,
    transferIds,
    transactionIdsOfTransfers: [...transferLegIds, ...orphanTransferLegIds],
    cardPaymentTransactionIds: cardPaymentRows.map((row) => row.id),
    cardPaymentIds: cardPayments.map((payment) => payment.id),
    openingBalance,
  };
}

function toPreview(plan: Awaited<ReturnType<typeof classifyPeriod>>): ClearPeriodPreview {
  return {
    deletable:
      plan.normalIds.length + plan.transactionIdsOfTransfers.length + plan.cardPaymentTransactionIds.length,
    breakdown: {
      normal: plan.normalIds.length,
      transfers: plan.transferIds.length,
      cardPayments: plan.cardPaymentTransactionIds.length,
      reconciled: plan.reconciled,
    },
    kept: { openingBalance: plan.openingBalance },
  };
}

function handleError(error: unknown, fallback: string) {
  if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
  if (isHttpError(error)) return failure(error.message, error.status, error.code);
  return failure(fallback, 500);
}

export async function previewClearPeriod(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const params = new URL(request.url).searchParams;
    const parsed = periodRangeSchema.safeParse({
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
      accountId: params.get("accountId") || undefined,
    });
    if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Período inválido", 400);

    const plan = await prisma.$transaction((tx) =>
      classifyPeriod(tx, userId, parsed.data, { lockCards: false }),
    );
    return success(toPreview(plan));
  } catch (error) {
    return handleError(error, "Erro ao calcular limpeza do período");
  }
}

export async function clearPeriod(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    const body = await request.json().catch(() => null);
    const parsed = clearSchema.safeParse(body);
    if (!parsed.success) return failure("Dados inválidos", 400);

    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        "Muitas alterações de transações em pouco tempo. Aguarde e tente novamente.",
        limit.retryAfterSeconds,
        "TRANSACTION_RATE_LIMITED",
      );
    }

    const { expectedCount, ...period } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const plan = await classifyPeriod(tx, userId, period, { lockCards: true });
      const preview = toPreview(plan);

      if (preview.deletable !== expectedCount) {
        throw new HttpError(
          "O período mudou desde a prévia. Revise e tente novamente.",
          409,
          "CLEAR_PERIOD_COUNT_MISMATCH",
        );
      }

      const touchedMonths = await tx.transaction.findMany({
        where: {
          userId,
          ...periodRangeWhere(period),
          ...(period.accountId ? { accountId: period.accountId } : {}),
        },
        select: { year: true, month: true },
        distinct: ["year", "month"],
      });
      await assertMonthsOpen(tx, userId, touchedMonths);

      let deleted = 0;

      // Pagamento de fatura: remove o registro do pagamento (reabre a fatura) e depois a saída na conta.
      if (plan.cardPaymentTransactionIds.length > 0) {
        await tx.creditCardPayment.deleteMany({ where: { id: { in: plan.cardPaymentIds }, userId } });
        deleted += (
          await tx.transaction.deleteMany({
            where: { id: { in: plan.cardPaymentTransactionIds }, userId, kind: "CARD_PAYMENT" },
          })
        ).count;
      }

      if (plan.transactionIdsOfTransfers.length > 0) {
        deleted += (
          await tx.transaction.deleteMany({
            where: { id: { in: plan.transactionIdsOfTransfers }, userId, kind: "TRANSFER" },
          })
        ).count;
        if (plan.transferIds.length > 0) {
          await tx.transfer.updateMany({
            where: { id: { in: plan.transferIds }, userId, deletedAt: null },
            data: { deletedAt: new Date() },
          });
        }
      }

      if (plan.normalIds.length > 0) {
        deleted += (
          await tx.transaction.deleteMany({
            where: { id: { in: plan.normalIds }, userId, kind: "NORMAL" },
          })
        ).count;
      }

      if (deleted !== preview.deletable) {
        throw new HttpError(
          "O período mudou durante a exclusão. Revise e tente novamente.",
          409,
          "CLEAR_PERIOD_COUNT_MISMATCH",
        );
      }

      for (const seriesId of plan.seriesIds) {
        await syncTransactionSeriesMetadata(tx, userId, seriesId);
      }

      return { deleted, breakdown: preview.breakdown, kept: preview.kept };
    });

    return success(result, "Período limpo com sucesso");
  } catch (error) {
    return handleError(error, "Erro ao limpar período");
  }
}
