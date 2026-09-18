import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { consumeTransactionMutationRateLimit } from "@/app/lib/security/application-rate-limit";
import { updateTransactionReconciliationSchema } from "@/app/lib/transactions/reconciliation-schema";

const RECONCILED_MUTATION_ERROR =
  "Transação reconciliada exige desfazer a reconciliação antes de alterações";

export async function updateTransactionReconciliation(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!context) {
      return failure("Transação não encontrada", 404);
    }

    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        "Muitas alterações financeiras em pouco tempo. Tente novamente em instantes",
        limit.retryAfterSeconds,
        "TRANSACTION_RATE_LIMITED",
      );
    }

    const input = updateTransactionReconciliationSchema.parse(
      await parseJsonBody(request),
    );
    const { id } = await context.params;
    const current = await prisma.transaction.findFirst({
      where: { id, userId },
      select: {
        id: true,
        status: true,
        reconciliationStatus: true,
        reconciledAt: true,
      },
    });

    if (!current) {
      return failure("Transação não encontrada", 404);
    }

    if (current.reconciliationStatus === "RECONCILED") {
      return failure(RECONCILED_MUTATION_ERROR, 409);
    }

    if (current.status !== "COMPLETED") {
      return failure("Somente transações concluídas podem ser conferidas", 400);
    }

    if (current.reconciliationStatus === input.status) {
      return success({
        id: current.id,
        reconciliationStatus: current.reconciliationStatus,
        reconciledAt: null,
      });
    }

    const updated = await prisma.transaction.updateMany({
      where: {
        id,
        userId,
        status: "COMPLETED",
        reconciliationStatus: current.reconciliationStatus,
      },
      data: {
        reconciliationStatus: input.status,
        reconciledAt: null,
      },
    });

    if (updated.count !== 1) {
      return failure(
        "O estado de reconciliação mudou; recarregue e tente novamente",
        409,
      );
    }

    return success(
      {
        id,
        reconciliationStatus: input.status,
        reconciledAt: null,
      },
      input.status === "CLEARED"
        ? "Transação marcada como conferida"
        : "Transação marcada como não conferida",
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }

    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }

    return failure("Erro ao atualizar conferência da transação", 500);
  }
}
