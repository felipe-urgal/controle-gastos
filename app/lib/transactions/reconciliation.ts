import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { updateTransactionReconciliationSchema } from "@/app/schemas/reconciliation.schema";

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

    const input = updateTransactionReconciliationSchema.parse(await request.json());
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

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }

    return failure("Erro ao atualizar conferência da transação", 500);
  }
}
