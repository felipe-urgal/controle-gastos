import { Prisma } from "@prisma/client";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import type { UndoAccountReconciliationInput } from "@/app/lib/transactions/reconciliation-schema";

const CHANGED_STATE_ERROR =
  "O estado da reconciliação mudou; recarregue e tente novamente";
const MAX_SERIALIZABLE_ATTEMPTS = 3;

async function runUndoTransaction(
  userId: string,
  accountId: string,
  input: UndoAccountReconciliationInput,
  batchReconciledAt: Date,
) {
  return prisma.$transaction(
    async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: accountId, userId },
        select: { id: true, name: true, currency: true },
      });

      if (!account) {
        throw new HttpError("Conta não encontrada", 404);
      }

      const existingUndo = await tx.accountReconciliationEvent.findUnique({
        where: {
          accountId_batchReconciledAt_action: {
            accountId,
            batchReconciledAt,
            action: "UNDONE",
          },
        },
        select: { createdAt: true },
      });

      if (existingUndo) {
        return {
          account,
          batchReconciledAt: input.reconciledAt,
          restoredCount: 0,
          undoneAt: existingUndo.createdAt.toISOString(),
          idempotent: true,
        };
      }

      const latest = await tx.transaction.findFirst({
        where: {
          userId,
          accountId,
          status: "COMPLETED",
          reconciliationStatus: "RECONCILED",
          reconciledAt: { not: null },
        },
        select: { reconciledAt: true },
        orderBy: { reconciledAt: "desc" },
      });

      if (!latest?.reconciledAt) {
        throw new HttpError("Não há fechamento reconciliado para desfazer", 409);
      }

      if (latest.reconciledAt.getTime() !== batchReconciledAt.getTime()) {
        throw new HttpError(
          "Somente o fechamento reconciliado mais recente pode ser desfeito",
          409,
        );
      }

      const targetCount = await tx.transaction.count({
        where: {
          userId,
          accountId,
          status: "COMPLETED",
          reconciliationStatus: "RECONCILED",
          reconciledAt: batchReconciledAt,
        },
      });

      if (targetCount === 0) {
        throw new HttpError(CHANGED_STATE_ERROR, 409);
      }

      const restored = await tx.transaction.updateMany({
        where: {
          userId,
          accountId,
          status: "COMPLETED",
          reconciliationStatus: "RECONCILED",
          reconciledAt: batchReconciledAt,
        },
        data: {
          reconciliationStatus: "CLEARED",
          reconciledAt: null,
        },
      });

      if (restored.count !== targetCount) {
        throw new HttpError(CHANGED_STATE_ERROR, 409);
      }

      const confirmedEvent = await tx.accountReconciliationEvent.findUnique({
        where: {
          accountId_batchReconciledAt_action: {
            accountId,
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
      });

      const undoEvent = await tx.accountReconciliationEvent.create({
        data: {
          action: "UNDONE",
          batchReconciledAt,
          transactionCount: restored.count,
          cutoffYear: confirmedEvent?.cutoffYear ?? null,
          cutoffMonth: confirmedEvent?.cutoffMonth ?? null,
          cutoffDay: confirmedEvent?.cutoffDay ?? null,
          statementBalance: confirmedEvent?.statementBalance ?? null,
          userId,
          accountId,
        },
        select: { createdAt: true },
      });

      return {
        account,
        batchReconciledAt: input.reconciledAt,
        restoredCount: restored.count,
        undoneAt: undoEvent.createdAt.toISOString(),
        idempotent: false,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function undoAccountReconciliationForUser(
  userId: string,
  accountId: string,
  input: UndoAccountReconciliationInput,
) {
  const batchReconciledAt = new Date(input.reconciledAt);

  for (let attempt = 0; attempt < MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await runUndoTransaction(
        userId,
        accountId,
        input,
        batchReconciledAt,
      );
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");

      if (retryable && attempt < MAX_SERIALIZABLE_ATTEMPTS - 1) {
        continue;
      }

      if (retryable) {
        throw new HttpError(CHANGED_STATE_ERROR, 409);
      }

      throw error;
    }
  }

  throw new HttpError(CHANGED_STATE_ERROR, 409);
}
