import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  calculateGoalPercentage,
  calculateGoalProgress,
  calculateGoalRemaining,
  monthlyContributionSuggestion,
  resolveGoalStatus,
  targetDateFromParts,
  targetDateParts,
} from "@/app/lib/goals/financial-goal-domain";
import {
  createFinancialGoalSchema,
  updateFinancialGoalSchema,
} from "@/app/lib/goals/financial-goal-schema";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

type GoalRecord = Awaited<ReturnType<typeof findOwnedGoal>>;

async function findOwnedGoal(userId: string, id: string) {
  return prisma.financialGoal.findFirst({
    where: { id, userId },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          currency: true,
          type: true,
          isActive: true,
        },
      },
      entries: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          createdAt: true,
        },
      },
    },
  });
}

async function assertOwnedCompatibleAccount(
  userId: string,
  accountId: string | null | undefined,
  currency: string,
) {
  if (!accountId) return null;

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: {
      id: true,
      name: true,
      currency: true,
      type: true,
      isActive: true,
    },
  });

  if (!account) {
    throw new HttpError("Conta inválida", 400, "FINANCIAL_GOAL_ACCOUNT_INVALID");
  }

  if (account.currency !== currency) {
    throw new HttpError(
      "A moeda da conta deve ser a mesma da meta",
      400,
      "FINANCIAL_GOAL_CURRENCY_MISMATCH",
    );
  }

  return account;
}

async function progressForGoalIds(userId: string, goalIds: string[]) {
  if (goalIds.length === 0) return new Map();

  const rows = await prisma.financialGoalEntry.groupBy({
    by: ["goalId", "type"],
    where: { userId, goalId: { in: goalIds } },
    _sum: { amount: true },
  });

  const byGoal = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byGoal.get(row.goalId) ?? [];
    list.push(row);
    byGoal.set(row.goalId, list);
  }

  return new Map(
    goalIds.map((goalId) => [
      goalId,
      calculateGoalProgress(byGoal.get(goalId) ?? []),
    ]),
  );
}

function toGoalResult(
  goal: NonNullable<GoalRecord> & { entries?: NonNullable<GoalRecord>["entries"] },
  progress: {
    contributions: number;
    withdrawals: number;
    currentAmount: number;
  },
) {
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currency: goal.currency,
    targetDate: targetDateFromParts(goal),
    status: goal.status,
    description: goal.description,
    account: goal.account,
    currentAmount: progress.currentAmount,
    contributions: progress.contributions,
    withdrawals: progress.withdrawals,
    remainingAmount: calculateGoalRemaining(
      progress.currentAmount,
      goal.targetAmount,
    ),
    percentage: calculateGoalPercentage(
      progress.currentAmount,
      goal.targetAmount,
    ),
    monthlyContributionSuggestion: monthlyContributionSuggestion({
      currentAmount: progress.currentAmount,
      targetAmount: goal.targetAmount,
      targetYear: goal.targetYear,
      targetMonth: goal.targetMonth,
      targetDay: goal.targetDay,
    }),
    entries: "entries" in goal ? goal.entries : undefined,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

export async function listFinancialGoalsForUser(userId: string) {
  const goals = await prisma.financialGoal.findMany({
    where: { userId },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          currency: true,
          type: true,
          isActive: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { targetYear: "asc" },
      { targetMonth: "asc" },
      { targetDay: "asc" },
      { createdAt: "desc" },
    ],
  });

  const progress = await progressForGoalIds(
    userId,
    goals.map((goal) => goal.id),
  );

  return goals.map((goal) =>
    toGoalResult(
      goal as NonNullable<GoalRecord>,
      progress.get(goal.id) ?? {
        contributions: 0,
        withdrawals: 0,
        currentAmount: 0,
      },
    ),
  );
}

export async function getFinancialGoals(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const currency = url.searchParams.get("currency");

    const all = await listFinancialGoalsForUser(userId);
    const items = all.filter(
      (goal) =>
        (!status || goal.status === status) &&
        (!currency || goal.currency === currency),
    );

    return success({ items, total: items.length });
  } catch (error) {
    return handleGoalError(error, "Erro ao carregar metas");
  }
}

export async function createFinancialGoal(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createFinancialGoalSchema.parse(await parseJsonBody(request));

    await assertOwnedCompatibleAccount(userId, input.accountId, input.currency);
    const dateParts = targetDateParts(input.targetDate);

    const created = await prisma.financialGoal.create({
      data: {
        userId,
        name: input.name,
        targetAmount: input.targetAmount,
        currency: input.currency,
        ...dateParts,
        description: input.description ?? null,
        accountId: input.accountId ?? null,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
            type: true,
            isActive: true,
          },
        },
        entries: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
        },
      },
    });

    return success(
      toGoalResult(created, {
        contributions: 0,
        withdrawals: 0,
        currentAmount: 0,
      }),
      "Meta criada com sucesso",
      201,
    );
  } catch (error) {
    return handleGoalError(error, "Erro ao criar meta");
  }
}

export async function getFinancialGoal(
  _request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Meta não encontrada", 404);
    const { id } = await context.params;
    const goal = await findOwnedGoal(userId, id);
    if (!goal) return failure("Meta não encontrada", 404);

    const progress = await progressForGoalIds(userId, [id]);
    return success(
      toGoalResult(
        goal,
        progress.get(id) ?? {
          contributions: 0,
          withdrawals: 0,
          currentAmount: 0,
        },
      ),
    );
  } catch (error) {
    return handleGoalError(error, "Erro ao carregar meta");
  }
}

export async function updateFinancialGoal(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Meta não encontrada", 404);
    const { id } = await context.params;
    const input = updateFinancialGoalSchema.parse(await parseJsonBody(request));

    const existing = await findOwnedGoal(userId, id);
    if (!existing) return failure("Meta não encontrada", 404);

    const progressMap = await progressForGoalIds(userId, [id]);
    const progress = progressMap.get(id) ?? {
      contributions: 0,
      withdrawals: 0,
      currentAmount: 0,
    };
    const hasEntries = progress.contributions > 0 || progress.withdrawals > 0;
    const nextCurrency = input.currency ?? existing.currency;

    if (hasEntries && input.currency && input.currency !== existing.currency) {
      throw new HttpError(
        "A moeda da meta não pode ser alterada após contribuições ou retiradas",
        409,
        "FINANCIAL_GOAL_CURRENCY_LOCKED",
      );
    }

    const nextAccountId =
      input.accountId !== undefined ? input.accountId : existing.accountId;
    await assertOwnedCompatibleAccount(userId, nextAccountId, nextCurrency);

    const nextTarget = input.targetAmount ?? existing.targetAmount;
    const nextStatus = resolveGoalStatus({
      currentAmount: progress.currentAmount,
      targetAmount: nextTarget,
      requestedStatus: input.status,
      existingStatus: existing.status,
    });

    const targetDateData =
      input.targetDate !== undefined
        ? targetDateParts(input.targetDate)
        : {};

    const updated = await prisma.financialGoal.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.targetAmount !== undefined
          ? { targetAmount: input.targetAmount }
          : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...targetDateData,
        ...(input.description !== undefined
          ? { description: input.description ?? null }
          : {}),
        ...(input.accountId !== undefined
          ? { accountId: input.accountId ?? null }
          : {}),
        status: nextStatus,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            currency: true,
            type: true,
            isActive: true,
          },
        },
        entries: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
        },
      },
    });

    return success(toGoalResult(updated, progress), "Meta atualizada com sucesso");
  } catch (error) {
    return handleGoalError(error, "Erro ao atualizar meta");
  }
}

export async function removeFinancialGoal(
  _request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Meta não encontrada", 404);
    const { id } = await context.params;

    const goal = await prisma.financialGoal.findFirst({
      where: { id, userId },
      select: {
        id: true,
        _count: { select: { entries: true } },
      },
    });
    if (!goal) return failure("Meta não encontrada", 404);

    if (goal._count.entries > 0) {
      throw new HttpError(
        "Meta com histórico não pode ser excluída; arquive-a para preservar os lançamentos",
        409,
        "FINANCIAL_GOAL_HAS_HISTORY",
      );
    }

    await prisma.financialGoal.delete({ where: { id: goal.id } });
    return success(null, "Meta excluída com sucesso");
  } catch (error) {
    return handleGoalError(error, "Erro ao excluir meta");
  }
}

export function handleGoalError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
  }
  if (isHttpError(error)) {
    return failure(error.message, error.status, error.code);
  }
  if (isUnauthorizedError(error)) {
    return failure("Não autenticado", 401);
  }
  return failure(fallback, 500);
}
