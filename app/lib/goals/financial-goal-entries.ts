import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  calculateGoalPercentage,
  calculateGoalProgress,
  calculateGoalRemaining,
  resolveGoalStatus,
} from "@/app/lib/goals/financial-goal-domain";
import { financialGoalEntrySchema } from "@/app/lib/goals/financial-goal-schema";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import {
  assertIdempotencyPayload,
  hashIdempotencyKey,
  hashIdempotencyPayload,
  normalizeIdempotencyKey,
  requireIdempotencyKey,
} from "@/app/lib/idempotency";
import { prisma } from "@/app/lib/prisma";

const MAX_SERIALIZABLE_ATTEMPTS = 3;
const CHANGED_STATE_ERROR =
  "O progresso da meta mudou; recarregue e tente novamente";

const publicEntrySelect = {
  id: true,
  type: true,
  amount: true,
  description: true,
  createdAt: true,
} satisfies Prisma.FinancialGoalEntrySelect;

type GoalEntryInput = ReturnType<typeof financialGoalEntrySchema.parse>;
type GoalTransactionClient = Pick<
  Prisma.TransactionClient,
  "financialGoal" | "financialGoalEntry"
>;

async function currentGoalProgress(
  db: GoalTransactionClient,
  userId: string,
  goalId: string,
) {
  const rows = await db.financialGoalEntry.groupBy({
    by: ["type"],
    where: { userId, goalId },
    _sum: { amount: true },
  });
  return calculateGoalProgress(rows);
}

async function goalResult(
  db: GoalTransactionClient,
  userId: string,
  goalId: string,
) {
  const goal = await db.financialGoal.findFirst({
    where: { id: goalId, userId },
    select: {
      id: true,
      name: true,
      targetAmount: true,
      currency: true,
      status: true,
    },
  });
  if (!goal) throw new HttpError("Meta não encontrada", 404);

  const progress = await currentGoalProgress(db, userId, goal.id);
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currency: goal.currency,
    status: goal.status,
    currentAmount: progress.currentAmount,
    remainingAmount: calculateGoalRemaining(
      progress.currentAmount,
      goal.targetAmount,
    ),
    percentage: calculateGoalPercentage(
      progress.currentAmount,
      goal.targetAmount,
    ),
  };
}

async function replayEntry(
  db: GoalTransactionClient,
  userId: string,
  goalId: string,
  idempotencyKeyHash: string,
  requestHash: string,
) {
  const existing = await db.financialGoalEntry.findFirst({
    where: { userId, idempotencyKeyHash },
    select: {
      ...publicEntrySelect,
      goalId: true,
      requestHash: true,
    },
  });
  if (!existing) return null;

  assertIdempotencyPayload(existing.requestHash, requestHash);
  if (existing.goalId !== goalId) {
    throw new HttpError(
      "Chave de idempotência já utilizada em outra meta",
      409,
      "IDEMPOTENCY_PAYLOAD_CONFLICT",
    );
  }

  const entry = {
    id: existing.id,
    type: existing.type,
    amount: existing.amount,
    description: existing.description,
    createdAt: existing.createdAt,
  };
  return {
    entry,
    goal: await goalResult(db, userId, goalId),
    replayed: true,
  };
}

async function createEntryTransaction(
  userId: string,
  goalId: string,
  input: GoalEntryInput,
  idempotencyKeyHash: string | null,
  requestHash: string | null,
) {
  return prisma.$transaction(
    async (tx) => {
      if (idempotencyKeyHash && requestHash) {
        const replay = await replayEntry(
          tx,
          userId,
          goalId,
          idempotencyKeyHash,
          requestHash,
        );
        if (replay) return replay;
      }

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

      const current = await currentGoalProgress(tx, userId, goal.id);

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
          idempotencyKeyHash,
          requestHash,
        },
        select: publicEntrySelect,
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
        replayed: false,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function createFinancialGoalEntryForUser(
  userId: string,
  goalId: string,
  input: GoalEntryInput,
  idempotencyKey?: string | null,
) {
  const normalizedKey =
    idempotencyKey === undefined
      ? null
      : normalizeIdempotencyKey(idempotencyKey ?? null);
  const idempotencyKeyHash = normalizedKey
    ? hashIdempotencyKey(normalizedKey)
    : null;
  const requestHash = normalizedKey
    ? hashIdempotencyPayload({
        goalId,
        type: input.type,
        amount: input.amount,
        description: input.description ?? null,
      })
    : null;

  if (idempotencyKeyHash && requestHash) {
    const replay = await replayEntry(
      prisma,
      userId,
      goalId,
      idempotencyKeyHash,
      requestHash,
    );
    if (replay) return replay;
  }

  for (let attempt = 0; attempt < MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await createEntryTransaction(
        userId,
        goalId,
        input,
        idempotencyKeyHash,
        requestHash,
      );
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

      if (
        idempotencyKeyHash &&
        requestHash &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const replay = await replayEntry(
          prisma,
          userId,
          goalId,
          idempotencyKeyHash,
          requestHash,
        );
        if (replay) return replay;
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
    const idempotencyKey = requireIdempotencyKey(request);
    const result = await createFinancialGoalEntryForUser(
      userId,
      id,
      input,
      idempotencyKey,
    );

    return success(
      result,
      result.replayed
        ? "Operação já registrada"
        : input.type === "CONTRIBUTION"
          ? "Contribuição registrada com sucesso"
          : "Retirada registrada com sucesso",
      result.replayed ? 200 : 201,
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
