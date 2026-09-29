import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId, isUnauthorizedError } from "@/app/lib/auth";
import {
  calculateGoalPercentage,
  calculateGoalProgress,
  calculateGoalRemaining,
  resolveGoalStatus,
} from "@/app/lib/goals/financial-goal-domain";
import { financialGoalEntrySchema } from "@/app/lib/goals/financial-goal-schema";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

const MAX_SERIALIZABLE_ATTEMPTS = 3;
const CHANGED_STATE_ERROR =
  "O progresso da meta mudou; recarregue e tente novamente";

async function createEntryTransaction(
  userId: string,
  goalId: string,
  input: ReturnType<typeof financialGoalEntrySchema.parse>,
) {
  return prisma.$transaction(
    async (tx) => {
      const goal = await tx.financialGoal.findFirst({
        where: { id: goalId, userId },
        select: {
          id: true,
          name: true,
          targetAmount: true,
          currency: true,
          status: true,
        },
      });

      if (!goal) {
        throw new HttpError("Meta não encontrada", 404);
      }
      if (goal.status === "ARCHIVED") {
        throw new HttpError(
          "Meta arquivada não aceita contribuições ou retiradas",
          409,
          "FINANCIAL_GOAL_ARCHIVED",
        );
      }
      if (goal.status === "COMPLETED" && input.type === "CONTRIBUTION") {
        throw new HttpError(
          "Meta já concluída; aumente o alvo antes de contribuir novamente",
          409,
          "FINANCIAL_GOAL_COMPLETED",
        );
      }

      const rows = await tx.financialGoalEntry.groupBy({
        by: ["type"],
        where: { userId, goalId: goal.id },
        _sum: { amount: true },
      });
      const current = calculateGoalProgress(rows);

      if (
        input.type === "WITHDRAWAL" &&
        input.amount > current.currentAmount
      ) {
        throw new HttpError(
          "Retirada não pode exceder o progresso atual",
          409,
          "FINANCIAL_GOAL_WITHDRAWAL_EXCEEDS_PROGRESS",
        );
      }

      const entry = await tx.financialGoalEntry.create({
        data: {
          userId,
          goalId: goal.id,
          type: input.type,
          amount: input.amount,
          description: input.description ?? null,
        },
      });

      const currentAmount =
        input.type === "CONTRIBUTION"
          ? current.currentAmount + input.amount
          : current.currentAmount - input.amount;
      const nextStatus = resolveGoalStatus({
        currentAmount,
        targetAmount: goal.targetAmount,
        existingStatus: goal.status,
      });

      if (nextStatus !== goal.status) {
        await tx.financialGoal.update({
          where: { id: goal.id },
          data: { status: nextStatus },
        });
      }

      return {
        entry,
        goal: {
          id: goal.id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          currency: goal.currency,
          status: nextStatus,
          currentAmount,
          remainingAmount: calculateGoalRemaining(
            currentAmount,
            goal.targetAmount,
          ),
          percentage: calculateGoalPercentage(
            currentAmount,
            goal.targetAmount,
          ),
        },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function createFinancialGoalEntryForUser(
  userId: string,
  goalId: string,
  input: ReturnType<typeof financialGoalEntrySchema.parse>,
) {
  for (let attempt = 0; attempt < MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await createEntryTransaction(userId, goalId, input);
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (retryable && attempt < MAX_SERIALIZABLE_ATTEMPTS - 1) {
        continue;
      }
      if (retryable) {
        throw new HttpError(
          CHANGED_STATE_ERROR,
          409,
          "FINANCIAL_GOAL_CONCURRENT_CHANGE",
        );
      }
      throw error;
    }
  }

  throw new HttpError(
    CHANGED_STATE_ERROR,
    409,
    "FINANCIAL_GOAL_CONCURRENT_CHANGE",
  );
}

export async function createFinancialGoalEntry(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Meta não encontrada", 404);
    const { id } = await context.params;
    const input = financialGoalEntrySchema.parse(await parseJsonBody(request));
    const result = await createFinancialGoalEntryForUser(userId, id, input);

    return success(
      result,
      input.type === "CONTRIBUTION"
        ? "Contribuição registrada com sucesso"
        : "Retirada registrada com sucesso",
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao atualizar progresso da meta", 500);
  }
}
