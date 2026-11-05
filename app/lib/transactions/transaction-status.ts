import { ZodError, z } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { assertCardPurchaseStatementMutable } from "@/app/lib/cards/credit-card-purchase-guards";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { assertMonthsOpen } from "@/app/lib/monthly-closing/month-lock";
import { prisma } from "@/app/lib/prisma";
import { consumeTransactionMutationRateLimit } from "@/app/lib/security/application-rate-limit";
import { syncTransactionSeriesMetadata } from "@/app/lib/transactions/transaction-series-metadata";

export const updateTransactionStatusSchema = z.object({
  status: z.enum(["COMPLETED", "PENDING", "CANCELLED"]),
});

/**
 * Troca só o status de um lançamento normal (concluído, pendente ou cancelado).
 * Segue as mesmas travas da edição: reconciliado e fatura de cartão fechada não mudam.
 */
export async function updateTransactionStatus(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Transação não encontrada", 404);

    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        "Muitas alterações financeiras em pouco tempo. Tente novamente em instantes",
        limit.retryAfterSeconds,
        "TRANSACTION_RATE_LIMITED",
      );
    }

    const input = updateTransactionStatusSchema.parse(await parseJsonBody(request));
    const { id } = await context.params;

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findFirst({
        where: { id, userId },
        include: { account: true },
      });
      if (!current) throw new HttpError("Transação não encontrada", 404);
      if (current.kind !== "NORMAL") {
        throw new HttpError("Esta movimentação deve ser alterada pelo fluxo dedicado", 400);
      }
      if (current.reconciliationStatus === "RECONCILED") {
        throw new HttpError(
          "Transação reconciliada exige desfazer a reconciliação antes de alterações",
          409,
        );
      }
      if (current.status === input.status) return { id, status: current.status };

      await assertMonthsOpen(tx, userId, [current]);
      await assertCardPurchaseStatementMutable(tx, userId, current.account, {
        year: current.year,
        month: current.month,
        day: current.day,
      });

      const updated = await tx.transaction.updateMany({
        where: {
          id,
          userId,
          kind: "NORMAL",
          status: current.status,
          reconciliationStatus: { not: "RECONCILED" },
        },
        data: {
          status: input.status,
          // Só transação concluída pode estar conferida; ao sair de "concluída" a conferência cai.
          ...(input.status !== "COMPLETED" ? { reconciliationStatus: "UNCLEARED", reconciledAt: null } : {}),
        },
      });
      if (updated.count !== 1) {
        throw new HttpError("O status mudou; recarregue e tente novamente", 409);
      }

      if (current.seriesId) {
        await syncTransactionSeriesMetadata(tx, userId, current.seriesId);
      }
      return { id, status: input.status };
    });

    return success(result, "Status da transação atualizado");
  } catch (error) {
    if (error instanceof ZodError) return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    if (isHttpError(error)) return failure(error.message, error.status, error.code);
    return failure("Erro ao atualizar status da transação", 500);
  }
}
