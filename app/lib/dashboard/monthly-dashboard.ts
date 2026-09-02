import { ZodError } from 'zod';

import { failure, success } from '@/app/lib/api-response';
import { calculateAccountBalanceMap } from '@/app/lib/accounts/account-balance';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { dashboardPeriodSchema } from '@/app/schemas/dashboard.schema';
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
    accountBalanceRows,
    incomePeriodRows,
    expensePeriodRows,
    categoryRows,
    expenseCategories,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        currency: true,
        isActive: true,
        color: true,
        icon: true,
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
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
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        ...ownedCompletedTransaction,
        year: period.year,
        month: period.month,
        category: { is: { userId, type: 'EXPENSE' } },
      },
      _sum: { amount: true },
    }),
    prisma.category.findMany({
      where: { userId, type: 'EXPENSE' },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        monthlyLimits: {
          where: {
            userId,
            year: period.year,
            month: period.month,
            currency,
          },
          select: { amount: true, currency: true },
          take: 1,
        },
      },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    }),
  ]);

  const periodRows: SummaryRow[] = [
    ...incomePeriodRows.map((row) => ({ ...row, type: 'INCOME' as const })),
    ...expensePeriodRows.map((row) => ({ ...row, type: 'EXPENSE' as const })),
  ];
  const accountBalances = calculateAccountBalanceMap(
    accounts.map((account) => account.id),
    accountBalanceRows,
  );
  const summary = summarizeDashboardPeriod(periodRows, period);
  const previousSummary = summarizeDashboardPeriod(periodRows, previousPeriod);
  const realizedByCategory = new Map(
    categoryRows.map((row) => [row.categoryId, row._sum.amount ?? 0]),
  );

  const categories = expenseCategories
    .map((category) => {
      const realized = realizedByCategory.get(category.id) ?? 0;
      return {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        currency,
        realized,
        sharePercentage:
          summary.expense === 0
            ? 0
            : Math.round((realized / summary.expense) * 1000) / 10,
      };
    })
    .filter((category) => category.realized > 0)
    .sort((left, right) => right.realized - left.realized);

  const limits = expenseCategories.flatMap((category) => {
    const limit = category.monthlyLimits[0];
    if (!limit) return [];

    const realized = realizedByCategory.get(category.id) ?? 0;
    const remaining = limit.amount - realized;

    return [
      {
        category: {
          id: category.id,
          name: category.name,
          color: category.color,
          icon: category.icon,
        },
        currency,
        amount: limit.amount,
        realized,
        remaining,
        percentage: Math.round((realized / limit.amount) * 1000) / 10,
      },
    ];
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
    accounts: accounts.map((account) => ({
      ...account,
      color: account.color ?? '#64748B',
      icon: account.icon ?? 'wallet',
      balance: accountBalances.get(account.id) ?? 0,
    })),
    categories,
    flow: flowPeriods.map((flowPeriod) => ({
      ...flowPeriod,
      currency,
      ...summarizeDashboardPeriod(periodRows, flowPeriod),
    })),
    limits,
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
  try {
    const userId = await getAuthenticatedUserId();
    const { currency, ...period } = periodFromRequest(request);
    const dashboard = await getMonthlyDashboardForUser(userId, period, currency);

    return success(dashboard);
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? 'Período inválido', 400);
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return failure('Não autenticado', 401);
    }

    return failure('Erro ao carregar dashboard financeiro', 500);
  }
}
