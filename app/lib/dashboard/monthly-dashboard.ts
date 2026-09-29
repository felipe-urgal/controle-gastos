import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { failure, success } from '@/app/lib/api-response';
import { calculateAccountBalanceMap } from '@/app/lib/accounts/account-balance';
import { buildCreditCardCommitments } from '@/app/lib/cards/credit-card-commitments';
import { listCategoryMonthlyLimitsForUser } from '@/app/lib/category-limits/category-monthly-limits';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import {
  calculateGoalPercentage,
  calculateGoalProgress,
  calculateGoalRemaining,
  monthlyContributionSuggestion,
  targetDateFromParts,
} from '@/app/lib/goals/financial-goal-domain';
import { prisma } from '@/app/lib/prisma';
import {
  getRequestId,
  logServerOperation,
  type LogContext,
  withRequestId,
} from '@/app/lib/observability';
import { dashboardPeriodSchema } from '@/app/lib/dashboard/dashboard-schema';
import type {
  DashboardComparisonMetric,
  DashboardPeriod,
  DashboardSummary,
  MonthlyDashboard,
} from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

type SummaryRow = {
  year: number;
  month: number;
  type: 'INCOME' | 'EXPENSE';
  _sum: { amount: number | null };
};

export function shiftDashboardPeriod(
  period: DashboardPeriod,
  offset: number,
): DashboardPeriod {
  const absoluteMonth = period.year * 12 + (period.month - 1) + offset;
  const year = Math.floor(absoluteMonth / 12);
  const zeroBasedMonth = ((absoluteMonth % 12) + 12) % 12;

  return { year, month: zeroBasedMonth + 1 };
}

export function getDashboardFlowPeriods(period: DashboardPeriod) {
  return Array.from({ length: 6 }, (_, index) =>
    shiftDashboardPeriod(period, index - 5),
  );
}

export function summarizeDashboardPeriod(
  rows: SummaryRow[],
  period: DashboardPeriod,
): DashboardSummary {
  let income = 0;
  let expense = 0;

  for (const row of rows) {
    if (row.year !== period.year || row.month !== period.month) continue;

    const amount = row._sum.amount ?? 0;
    if (row.type === 'INCOME') income += amount;
    if (row.type === 'EXPENSE') expense += amount;
  }

  return {
    income,
    expense,
    balance: income - expense,
  };
}

export function dashboardComparisonMetric(
  current: number,
  previous: number,
): DashboardComparisonMetric {
  const difference = current - previous;

  return {
    difference,
    percentage:
      previous === 0
        ? null
        : Math.round((difference / Math.abs(previous)) * 1000) / 10,
  };
}

export async function getMonthlyDashboardForUser(
  userId: string,
  period: DashboardPeriod,
  currency: SupportedCurrency = 'BRL',
): Promise<MonthlyDashboard> {
  const flowPeriods = getDashboardFlowPeriods(period);
  const previousPeriod = shiftDashboardPeriod(period, -1);
  const periodFilter = flowPeriods.map(({ year, month }) => ({ year, month }));
  const ownedCompletedAnyCurrency = {
    userId,
    status: 'COMPLETED' as const,
    account: { is: { userId } },
  };
  const ownedCompletedTransaction = {
    userId,
    status: 'COMPLETED' as const,
    account: { is: { userId, currency } },
  };

  const [
    accounts,
    cardAccounts,
    accountBalanceRows,
    incomePeriodRows,
    expensePeriodRows,
    planning,
    activeGoals,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { userId, type: { not: 'CREDIT_CARD' } },
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        isActive: true,
        color: true,
        icon: true,
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    }),
    prisma.account.findMany({
      where: {
        userId,
        type: 'CREDIT_CARD',
        isActive: true,
        currency,
      },
      select: {
        id: true,
        name: true,
        currency: true,
        color: true,
        icon: true,
        creditLimit: true,
        statementClosingDay: true,
        statementDueDay: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    }),
    prisma.transaction.groupBy({
      by: ['accountId', 'type'],
      where: ownedCompletedAnyCurrency,
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['year', 'month'],
      where: {
        ...ownedCompletedTransaction,
        category: { is: { userId, type: 'INCOME' } },
        OR: periodFilter,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['year', 'month'],
      where: {
        ...ownedCompletedTransaction,
        category: { is: { userId, type: 'EXPENSE' } },
        OR: periodFilter,
      },
      _sum: { amount: true },
    }),
    listCategoryMonthlyLimitsForUser(
      userId,
      period.year,
      period.month,
      currency,
    ),
    prisma.financialGoal.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        currency,
      },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currency: true,
        targetYear: true,
        targetMonth: true,
        targetDay: true,
        createdAt: true,
      },
      orderBy: [
        { targetYear: 'asc' },
        { targetMonth: 'asc' },
        { targetDay: 'asc' },
        { createdAt: 'asc' },
      ],
    }),
  ]);

  const cardIds = cardAccounts.map((card) => card.id);
  const statementPeriods = Array.from({ length: 5 }, (_, index) =>
    shiftDashboardPeriod(period, index - 1),
  );

  const [cardPurchaseRows, cardPaymentRows, cardTransactions, cardPayments] =
    await Promise.all([
          prisma.transaction.groupBy({
            by: ['accountId'],
            where: {
              userId,
              accountId: { in: cardIds },
              kind: 'NORMAL',
              type: 'EXPENSE',
              status: { not: 'CANCELLED' },
            },
            _sum: { amount: true },
          }),
          prisma.creditCardPayment.groupBy({
            by: ['cardAccountId'],
            where: { userId, cardAccountId: { in: cardIds } },
            _sum: { amount: true },
          }),
          prisma.transaction.findMany({
            where: {
              userId,
              accountId: { in: cardIds },
              kind: 'NORMAL',
              type: 'EXPENSE',
              status: { not: 'CANCELLED' },
              OR: statementPeriods,
            },
            select: {
              id: true,
              accountId: true,
              amount: true,
              year: true,
              month: true,
              day: true,
              type: true,
              status: true,
              description: true,
              seriesId: true,
              seriesIndex: true,
            },
            orderBy: [
              { year: 'asc' },
              { month: 'asc' },
              { day: 'asc' },
              { id: 'asc' },
            ],
          }),
          prisma.creditCardPayment.findMany({
            where: {
              userId,
              cardAccountId: { in: cardIds },
              OR: statementPeriods.map(({ year, month }) => ({
                closingYear: year,
                closingMonth: month,
              })),
            },
            select: {
              cardAccountId: true,
              closingYear: true,
              closingMonth: true,
              closingDay: true,
            },
          }),
        ]);

  const cardPurchaseTotals = new Map(
    cardPurchaseRows.map((row) => [row.accountId, row._sum.amount ?? 0]),
  );
  const cardPaymentTotals = new Map(
    cardPaymentRows.map((row) => [row.cardAccountId, row._sum.amount ?? 0]),
  );
  const transactionsByCard = new Map<string, typeof cardTransactions>();
  for (const transaction of cardTransactions) {
    const list = transactionsByCard.get(transaction.accountId) ?? [];
    list.push(transaction);
    transactionsByCard.set(transaction.accountId, list);
  }

  const cardCommitments = buildCreditCardCommitments({
    asOf: { year: period.year, month: period.month, day: 1 },
    historyLimit: 2,
    cards: cardAccounts.flatMap((card) =>
      card.statementClosingDay !== null && card.statementDueDay !== null
        ? [{
            id: card.id,
            name: card.name,
            statementClosingDay: card.statementClosingDay,
            statementDueDay: card.statementDueDay,
          }]
        : [],
    ),
    transactionsByCard,
    payments: cardPayments,
  });

  const periodStart = { year: period.year, month: period.month, day: 1 };
  const nextCommitmentByCard = new Map<string, (typeof cardCommitments)[number]>();
  for (const commitment of cardCommitments) {
    if (
      commitment.dueDate.year < periodStart.year ||
      (commitment.dueDate.year === periodStart.year &&
        commitment.dueDate.month < periodStart.month)
    ) {
      continue;
    }
    if (!nextCommitmentByCard.has(commitment.cardId)) {
      nextCommitmentByCard.set(commitment.cardId, commitment);
    }
  }

  const periodRows: SummaryRow[] = [
    ...incomePeriodRows.map((row) => ({ ...row, type: 'INCOME' as const })),
    ...expensePeriodRows.map((row) => ({ ...row, type: 'EXPENSE' as const })),
  ];
  const dashboardAccounts = accounts.filter(
    (
      account,
    ): account is typeof account & { type: 'CREDIT_DEBIT' | 'INVESTMENT' } =>
      account.type !== 'CREDIT_CARD',
  );
  const accountBalances = calculateAccountBalanceMap(
    dashboardAccounts.map((account) => account.id),
    accountBalanceRows,
  );
  const summary = summarizeDashboardPeriod(periodRows, period);
  const previousSummary = summarizeDashboardPeriod(periodRows, previousPeriod);
  const categories = planning.items
    .map((item) => ({
      id: item.category.id,
      name: item.category.name,
      color: item.category.color,
      icon: item.category.icon,
      currency,
      realized: item.realized,
      sharePercentage:
        summary.expense === 0
          ? 0
          : Math.round((item.realized / summary.expense) * 1000) / 10,
    }))
    .filter((category) => category.realized > 0)
    .sort((left, right) => right.realized - left.realized);

  const limits = planning.items.flatMap((item) => {
    if (!item.limit) return [];

    return [{
      category: {
        id: item.category.id,
        name: item.category.name,
        color: item.category.color,
        icon: item.category.icon,
      },
      currency,
      amount: item.limit.amount,
      realized: item.realized,
      committed: item.committed,
      consumption: item.consumption,
      remaining: item.remaining ?? 0,
      available: item.available ?? 0,
      percentage: item.percentage ?? 0,
      planningPercentage: item.planningPercentage,
      isOverBudget: item.isOverBudget,
    }];
  });

  const goalIds = activeGoals.map((goal) => goal.id);
  const goalEntryRows =
    goalIds.length === 0
      ? []
      : await prisma.financialGoalEntry.groupBy({
          by: ['goalId', 'type'],
          where: { userId, goalId: { in: goalIds } },
          _sum: { amount: true },
        });

  const goalRowsByGoal = new Map<string, typeof goalEntryRows>();
  for (const row of goalEntryRows) {
    const list = goalRowsByGoal.get(row.goalId) ?? [];
    list.push(row);
    goalRowsByGoal.set(row.goalId, list);
  }

  const dashboardGoals = activeGoals.map((goal) => {
    const progress = calculateGoalProgress(goalRowsByGoal.get(goal.id) ?? []);
    return {
      id: goal.id,
      name: goal.name,
      currency,
      targetAmount: goal.targetAmount,
      currentAmount: progress.currentAmount,
      remainingAmount: calculateGoalRemaining(
        progress.currentAmount,
        goal.targetAmount,
      ),
      percentage: calculateGoalPercentage(
        progress.currentAmount,
        goal.targetAmount,
      ),
      targetDate: targetDateFromParts(goal),
      monthlyContributionSuggestion: monthlyContributionSuggestion({
        currentAmount: progress.currentAmount,
        targetAmount: goal.targetAmount,
        targetYear: goal.targetYear,
        targetMonth: goal.targetMonth,
        targetDay: goal.targetDay,
      }),
    };
  });

  return {
    period,
    currency,
    summary,
    comparison: {
      previousPeriod,
      income: dashboardComparisonMetric(summary.income, previousSummary.income),
      expense: dashboardComparisonMetric(summary.expense, previousSummary.expense),
      balance: dashboardComparisonMetric(summary.balance, previousSummary.balance),
    },
    accounts: dashboardAccounts.map((account) => ({
      ...account,
      color: account.color ?? '#64748B',
      icon: account.icon ?? 'wallet',
      balance: accountBalances.get(account.id) ?? 0,
    })),
    cards: cardAccounts.flatMap((card) => {
      if (
        card.creditLimit === null ||
        card.statementClosingDay === null ||
        card.statementDueDay === null
      ) {
        return [];
      }

      const usedLimit = Math.max(
        0,
        (cardPurchaseTotals.get(card.id) ?? 0) -
          (cardPaymentTotals.get(card.id) ?? 0),
      );
      const availableLimit = Math.max(0, card.creditLimit - usedLimit);
      const overLimit = Math.max(0, usedLimit - card.creditLimit);
      const nextStatement = nextCommitmentByCard.get(card.id) ?? null;

      return [{
        id: card.id,
        name: card.name,
        currency,
        color: card.color ?? '#7C3AED',
        icon: card.icon ?? 'credit-card',
        creditLimit: card.creditLimit,
        usedLimit,
        availableLimit,
        overLimit,
        nextStatement: nextStatement
          ? {
              amount: nextStatement.amount,
              closingDate: nextStatement.closingDate,
              dueDate: nextStatement.dueDate,
              transactionCount: nextStatement.transactionCount,
            }
          : null,
      }];
    }),
    goals: dashboardGoals,
    categories,
    flow: flowPeriods.map((flowPeriod) => ({
      ...flowPeriod,
      currency,
      ...summarizeDashboardPeriod(periodRows, flowPeriod),
    })),
    limits,
    planning: planning.summary,
  };
}

function periodFromRequest(request: Request) {
  const url = new URL(request.url);
  return dashboardPeriodSchema.parse({
    year: url.searchParams.get('year'),
    month: url.searchParams.get('month'),
    currency: url.searchParams.get('currency') ?? undefined,
  });
}

export async function getMonthlyDashboard(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = performance.now();

  function finish(
    response: NextResponse,
    context: LogContext = {},
    error?: unknown,
  ) {
    logServerOperation({
      event: 'monthly_dashboard',
      requestId,
      route: '/api/dashboard',
      status: response.status,
      startedAt,
      context,
      error,
    });
    return withRequestId(response, requestId);
  }

  try {
    const userId = await getAuthenticatedUserId();
    const { currency, ...period } = periodFromRequest(request);
    const dashboard = await getMonthlyDashboardForUser(userId, period, currency);

    return finish(success(dashboard), {
      result: 'success',
      currency,
      accountCount: dashboard.accounts.length,
      categoryCount: dashboard.categories.length,
      limitCount: dashboard.limits.length,
      goalCount: dashboard.goals.length,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return finish(
        failure(error.issues[0]?.message ?? 'Período inválido', 400),
        { result: 'invalid_input' },
      );
    }

    if (isUnauthorizedError(error)) {
      return finish(failure('Não autenticado', 401), {
        result: 'unauthorized',
      });
    }

    return finish(
      failure('Erro ao carregar dashboard financeiro', 500),
      { result: 'error' },
      error,
    );
  }
}
