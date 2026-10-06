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
const MAX_SERIALIZABLE_ATTEMPTS = 3;
const HISTORY_PAGE_SIZE = 20;
const HISTORY_MAX_PAGE_SIZE = 50;

const accountSelect = {
  id: true,
  name: true,
  currency: true,
  type: true,
  isActive: true,
} satisfies Prisma.AccountSelect;

const goalListInclude = {
  account: { select: accountSelect },
  _count: { select: { entries: true } },
} satisfies Prisma.FinancialGoalInclude;

type GoalRecord = Prisma.FinancialGoalGetPayload<{
  include: typeof goalListInclude;
}>;

type DbClient = Prisma.TransactionClient | typeof prisma;

async function assertOwnedCompatibleAccount(
  db: DbClient,
  userId: string,
  accountId: string | null | undefined,
  currency: string,
) {
  if (!accountId) return null;

  const account = await db.account.findFirst({
    where: { id: accountId, userId },
    select: accountSelect,
  });

  if (!account) {
    throw new HttpError("Conta inválida", 400, "FINANCIAL_GOAL_ACCOUNT_INVALID");
  }

  if (!account.isActive) {
    throw new HttpError(
      "Selecione uma conta ativa para um novo vínculo",
      400,
      "FINANCIAL_GOAL_ACCOUNT_INACTIVE",
    );
  }

  if (account.type === "CREDIT_CARD") {
    throw new HttpError(
      "Cartão de crédito não pode ser conta de referência de uma meta",
      400,
      "FINANCIAL_GOAL_ACCOUNT_TYPE_INVALID",
    );
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

async function progressForGoalIds(
  db: DbClient,
  userId: string,
  goalIds: string[],
) {
  if (goalIds.length === 0) return new Map();

  const rows = await db.financialGoalEntry.groupBy({
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
  goal: GoalRecord,
  progress: {
    contributions: number;
    withdrawals: number;
    currentAmount: number;
  },
  options?: {
    entries?: Array<{
      id: string;
      type: "CONTRIBUTION" | "WITHDRAWAL";
      amount: number;
      description: string | null;
      createdAt: Date;
    }>;
    entryHistory?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
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
    entryCount: goal._count.entries,
    entries: options?.entries,
    entryHistory: options?.entryHistory,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

function historyPage(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? String(HISTORY_PAGE_SIZE));

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > HISTORY_MAX_PAGE_SIZE
  ) {
    throw new HttpError("Paginação de histórico inválida", 400, "INVALID_QUERY");
  }

  return { page, limit };
}

type GoalFilters = {
  status?: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  currency?: "BRL" | "USD" | "EUR";
};

export async function listFinancialGoalsForUser(
  userId: string,
  filters: GoalFilters = {},
) {
  const goals = await prisma.financialGoal.findMany({
    where: {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.currency ? { currency: filters.currency } : {}),
    },
    include: goalListInclude,
    orderBy: [
      { status: "asc" },
      { targetYear: "asc" },
      { targetMonth: "asc" },
      { targetDay: "asc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
  });

  const progress = await progressForGoalIds(
    prisma,
    userId,
    goals.map((goal) => goal.id),
  );

  return goals.map((goal) =>
    toGoalResult(
      goal,
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

    const validStatuses = ["ACTIVE", "COMPLETED", "ARCHIVED"] as const;
    const validCurrencies = ["BRL", "USD", "EUR"] as const;

    if (
      status &&
      !validStatuses.includes(status as (typeof validStatuses)[number])
    ) {
      throw new HttpError("Status de meta inválido", 400, "INVALID_QUERY");
    }
    if (
      currency &&
      !validCurrencies.includes(currency as (typeof validCurrencies)[number])
    ) {
      throw new HttpError("Moeda inválida", 400, "INVALID_QUERY");
    }

    const items = await listFinancialGoalsForUser(userId, {
      status: status as GoalFilters["status"],
      currency: currency as GoalFilters["currency"],
    });

    return success({ items, total: items.length });
  } catch (error) {
    return handleGoalError(error, "Erro ao carregar metas");
  }
}

export async function createFinancialGoal(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createFinancialGoalSchema.parse(await parseJsonBody(request));

    await assertOwnedCompatibleAccount(
      prisma,
      userId,
      input.accountId,
      input.currency,
    );
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
      include: goalListInclude,
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
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Meta não encontrada", 404);
    const { id } = await context.params;
    const { page, limit } = historyPage(request);

    const goal = await prisma.financialGoal.findFirst({
      where: { id, userId },
      include: goalListInclude,
    });
    if (!goal) return failure("Meta não encontrada", 404);

    const [progress, entries] = await Promise.all([
      progressForGoalIds(prisma, userId, [id]),
      prisma.financialGoalEntry.findMany({
        where: { userId, goalId: id },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return success(
      toGoalResult(
        goal,
        progress.get(id) ?? {
          contributions: 0,
          withdrawals: 0,
          currentAmount: 0,
        },
        {
          entries,
          entryHistory: {
            page,
            limit,
            total: goal._count.entries,
            hasMore: page * limit < goal._count.entries,
          },
        },
      ),
    );
  } catch (error) {
    return handleGoalError(error, "Erro ao carregar meta");
  }
}

async function updateFinancialGoalTransaction(
  userId: string,
  id: string,
  input: ReturnType<typeof updateFinancialGoalSchema.parse>,
) {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.financialGoal.findFirst({
        where: { id, userId },
        include: goalListInclude,
      });
      if (!existing) throw new HttpError("Meta não encontrada", 404);

      const progressMap = await progressForGoalIds(tx, userId, [id]);
      const progress = progressMap.get(id) ?? {
        contributions: 0,
        withdrawals: 0,
        currentAmount: 0,
      };
      const hasEntries = existing._count.entries > 0;
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

      if (
        input.accountId !== undefined ||
        (input.currency !== undefined &&
          input.currency !== existing.currency &&
          nextAccountId)
      ) {
        await assertOwnedCompatibleAccount(
          tx,
          userId,
          nextAccountId,
          nextCurrency,
        );
      }

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

      const updated = await tx.financialGoal.update({
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
        include: goalListInclude,
      });

      return toGoalResult(updated, progress);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
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

    for (let attempt = 0; attempt < MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
      try {
        const updated = await updateFinancialGoalTransaction(userId, id, input);
        return success(updated, "Meta atualizada com sucesso");
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034";
        if (retryable && attempt < MAX_SERIALIZABLE_ATTEMPTS - 1) continue;
        if (retryable) {
          throw new HttpError(
            "O progresso da meta mudou durante a edição. Recarregue e tente novamente",
            409,
            "FINANCIAL_GOAL_CONCURRENT_CHANGE",
          );
        }
        throw error;
      }
    }

    throw new HttpError(
      "O progresso da meta mudou durante a edição. Recarregue e tente novamente",
      409,
      "FINANCIAL_GOAL_CONCURRENT_CHANGE",
    );
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
