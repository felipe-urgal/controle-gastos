import { Prisma } from "@prisma/client";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import type { AccountReconciliationPreviewInput } from "@/app/schemas/reconciliation.schema";
import { calculateReconciliationPreview } from "@/app/lib/transactions/reconciliation-preview";

export async function confirmAccountReconciliationForUser(
  userId: string,
  accountId: string,
  input: AccountReconciliationPreviewInput,
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const account = await tx.account.findFirst({
          where: { id: accountId, userId },
          select: { id: true, name: true, currency: true },
        });

        if (!account) {
          throw new HttpError("Conta não encontrada", 404);
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

        const rows = await tx.transaction.findMany({
          where: {
            userId,
            accountId,
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
          orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }, { id: "asc" }],
        });

        const preview = calculateReconciliationPreview(rows, input.statementBalance);
        if (preview.difference !== 0) {
          throw new HttpError(
            "A reconciliação só pode ser confirmada quando a diferença for zero",
            409,
          );
        }

        const clearedIds = rows
          .filter((row) => row.reconciliationStatus === "CLEARED")
          .map((row) => row.id);
        const reconciledAt = new Date();

        if (clearedIds.length > 0) {
          const promoted = await tx.transaction.updateMany({
            where: {
              id: { in: clearedIds },
              userId,
              accountId,
              status: "COMPLETED",
              reconciliationStatus: "CLEARED",
              OR: cutoff,
            },
            data: {
              reconciliationStatus: "RECONCILED",
              reconciledAt,
            },
          });

          if (promoted.count !== clearedIds.length) {
            throw new HttpError(
              "O estado da reconciliação mudou; recarregue e tente novamente",
              409,
            );
          }
        }

        return {
          account,
          cutoff: { year: input.year, month: input.month, day: input.day },
          statementBalance: input.statementBalance,
          clearedBalance: preview.clearedBalance,
          difference: 0,
          reconciledCount: clearedIds.length,
          reconciledAt: clearedIds.length > 0 ? reconciledAt.toISOString() : null,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new HttpError(
        "O estado da reconciliação mudou; recarregue e tente novamente",
        409,
      );
    }

    throw error;
  }
}
