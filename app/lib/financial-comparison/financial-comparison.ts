import { NextResponse } from 'next/server';
import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import {
  getLastDayOfMonth,
  logicalDateFromUtcInstant,
  type LogicalDate,
} from '@/app/lib/date/logical-date';
import {
  averageComparisonAmount,
  comparisonRangesOverlap,
  enumerateComparisonMonths,
  financialComparisonMetric,
  isComparisonMonthInRange,
  isComparisonRangeInFuture,
  parseComparisonMonth,
} from '@/app/lib/financial-comparison/financial-comparison-domain';
import { HttpError } from '@/app/lib/http-error';
import { getNetWorthForUser } from '@/app/lib/net-worth/net-worth';
import { prisma } from '@/app/lib/prisma';
import {
  getRequestId,
  logServerOperation,
  type LogContext,
  withRequestId,
} from '@/app/lib/observability';
import type {
  ComparisonMonth,
  ComparisonRange,
  FinancialComparisonData,
  FinancialComparisonSide,
} from '@/app/types/financial-comparison';
import {
  isSupportedCurrency,
  type SupportedCurrency,
} from '@/app/types/financial-summary';

const UNCATEGORIZED_CATEGORY_ID = '__uncategorized__';

function rangeFromParams(
  params: URLSearchParams,
  prefix: 'a' | 'b',
): ComparisonRange {
  const from = parseComparisonMonth(params.get(`${prefix}From`) ?? '');
  const to = parseComparisonMonth(params.get(`${prefix}To`) ?? '');
  if (!from || !to) {
    throw new HttpError(
      'Período de comparação inválido',
      400,
      'INVALID_COMPARISON_PERIOD',
    );
  }
  return { from, to };
}

function rangeFilter(range: ComparisonRange) {
  if (range.from.year === range.to.year) {
    return {
      year: range.from.year,
      month: { gte: range.from.month, lte: range.to.month },
    };
  }

  return {
    OR: [
      { year: range.from.year, month: { gte: range.from.month } },
      { year: { gt: range.from.year, lt: range.to.year } },
      { year: range.to.year, month: { lte: range.to.month } },
    ],
  };
}

function combinedRangeFilter(a: ComparisonRange, b: ComparisonRange) {
  return {
    OR: [rangeFilter(a), rangeFilter(b)],
  };
}

function validateRange(
  range: ComparisonRange,
  currentMonth: ComparisonMonth,
) {
  try {
    enumerateComparisonMonths(range);
  } catch (cause) {
    throw new HttpError(
      cause instanceof Error
        ? cause.message
        : 'Período de comparação inválido',
      400,
      'INVALID_COMPARISON_PERIOD',
    );
  }

  if (isComparisonRangeInFuture(range, currentMonth)) {
    throw new HttpError(
      'Períodos futuros não podem ser comparados como realizado',
      400,
      'FUTURE_COMPARISON_PERIOD',
    );
  }
}

function periodKey(period: ComparisonMonth) {
  return `${period.year}-${period.month}`;
}

function netWorthAsOf(
  period: ComparisonMonth,
  currentMonth: ComparisonMonth,
  asOf: LogicalDate,
) {
  if (
    period.year === currentMonth.year &&
    period.month === currentMonth.month
  ) {
    return asOf;
  }

  return {
    year: period.year,
    month: period.month,
    day: getLastDayOfMonth(period.year, period.month),
  };
}

type CategoryMeta = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

type CategoryMonthlyAmount = {
  categoryId: string;
  year: number;
  month: number;
  amount: number;
};

function aggregateSide(input: {
  range: ComparisonRange;
  currency: SupportedCurrency;
  summaryRows: Array<{
    year: number;
    month: number;
    type: 'INCOME' | 'EXPENSE';
    _sum: { amount: number | null };
  }>;
  cardCreditRows: Array<{
    year: number;
    month: number;
    _sum: { amount: number | null };
  }>;
  categoryMonthlyAmounts: CategoryMonthlyAmount[];
  categoryById: Map<string, CategoryMeta>;
  netWorthEnd: number | null;
  netWorthStatus: 'AVAILABLE' | 'NO_DATA' | 'ERROR';
  netWorthAsOf: LogicalDate;
}): FinancialComparisonSide {
  const periods = enumerateComparisonMonths(input.range);
  let income = 0;
  let expense = 0;

  for (const row of input.summaryRows) {
    if (
      !isComparisonMonthInRange(
        { year: row.year, month: row.month },
        input.range,
      )
    ) {
      continue;
    }

    const amount = row._sum.amount ?? 0;
    if (row.type === 'INCOME') income += amount;
    if (row.type === 'EXPENSE') expense += amount;
  }

  let cardCredits = 0;
  for (const row of input.cardCreditRows) {
    if (
      isComparisonMonthInRange(
        { year: row.year, month: row.month },
        input.range,
      )
    ) {
      cardCredits += row._sum.amount ?? 0;
    }
  }

  income -= cardCredits;
  expense -= cardCredits;

  const amountByCategory = new Map<string, number>();
  for (const row of input.categoryMonthlyAmounts) {
    if (
      !isComparisonMonthInRange(
        { year: row.year, month: row.month },
        input.range,
      )
    ) {
      continue;
    }

    amountByCategory.set(
      row.categoryId,
      (amountByCategory.get(row.categoryId) ?? 0) + row.amount,
    );
  }

  const categories = [...amountByCategory.entries()]
    .filter(([, amount]) => amount !== 0)
    .flatMap(([id, amount]) => {
      const category = input.categoryById.get(id);
      return category
        ? [{
            ...category,
            amount,
            averageMonthlyAmount: averageComparisonAmount(
              amount,
              periods.length,
            ),
          }]
        : [];
    })
    .sort(
      (left, right) =>
        Math.abs(right.amount) - Math.abs(left.amount),
    );

  return {
    range: input.range,
    months: periods.length,
    income,
    expense,
    balance: income - expense,
    averageMonthlyIncome: averageComparisonAmount(income, periods.length),
    averageMonthlyExpense: averageComparisonAmount(expense, periods.length),
    averageMonthlyBalance: averageComparisonAmount(
      income - expense,
      periods.length,
    ),
    netWorthEnd: input.netWorthEnd,
    netWorthStatus: input.netWorthStatus,
    netWorthAsOf: input.netWorthAsOf,
    categories,
  };
}

export async function getFinancialComparisonForUser(
  userId: string,
  input: {
    a: ComparisonRange;
    b: ComparisonRange;
    currency: SupportedCurrency;
  },
  now: Date = new Date(),
): Promise<FinancialComparisonData> {
  const asOf = logicalDateFromUtcInstant(now);
  const currentMonth = { year: asOf.year, month: asOf.month };

  validateRange(input.a, currentMonth);
  validateRange(input.b, currentMonth);

  const periodsFilter = combinedRangeFilter(input.a, input.b);
  const ownedCompletedNormal = {
    userId,
    kind: 'NORMAL' as const,
    status: 'COMPLETED' as const,
    account: { is: { userId, currency: input.currency } },
  };

  const [
    summaryRows,
    cardCreditRows,
    plainCategoryRows,
    allocationRows,
    netWorthResults,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['year', 'month', 'type'],
      where: {
        ...ownedCompletedNormal,
        AND: [periodsFilter],
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['year', 'month'],
      where: {
        userId,
        kind: 'NORMAL',
        type: 'INCOME',
        status: 'COMPLETED',
        account: {
          is: {
            userId,
            currency: input.currency,
            type: 'CREDIT_CARD',
          },
        },
        AND: [periodsFilter],
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['year', 'month', 'type', 'categoryId'],
      where: {
        userId,
        kind: 'NORMAL',
        status: 'COMPLETED',
        allocations: { none: {} },
        account: { is: { userId, currency: input.currency } },
        AND: [
          periodsFilter,
          {
            OR: [
              { type: 'EXPENSE' },
              {
                type: 'INCOME',
                account: {
                  is: {
                    userId,
                    currency: input.currency,
                    type: 'CREDIT_CARD',
                  },
                },
              },
            ],
          },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.transactionAllocation.findMany({
      where: {
        userId,
        transaction: {
          is: {
            userId,
            kind: 'NORMAL',
            status: 'COMPLETED',
            account: { is: { userId, currency: input.currency } },
            AND: [
              periodsFilter,
              {
                OR: [
                  { type: 'EXPENSE' },
                  {
                    type: 'INCOME',
                    account: {
                      is: {
                        userId,
                        currency: input.currency,
                        type: 'CREDIT_CARD',
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      },
      select: {
        categoryId: true,
        amount: true,
        transaction: {
          select: {
            year: true,
            month: true,
            type: true,
          },
        },
      },
    }),
    Promise.allSettled([
      getNetWorthForUser(userId, {
        year: input.a.to.year,
        month: input.a.to.month,
        months: 1,
        referenceNow: now,
        includeCurrentValuation: false,
      }),
      getNetWorthForUser(userId, {
        year: input.b.to.year,
        month: input.b.to.month,
        months: 1,
        referenceNow: now,
        includeCurrentValuation: false,
      }),
    ]),
  ]);

  const [netWorthAResult, netWorthBResult] = netWorthResults;
  const netWorthA =
    netWorthAResult.status === 'fulfilled'
      ? netWorthAResult.value
      : null;
  const netWorthB =
    netWorthBResult.status === 'fulfilled'
      ? netWorthBResult.value
      : null;

  const categoryMonthly = new Map<string, CategoryMonthlyAmount>();

  function addCategoryAmount(
    categoryId: string,
    year: number,
    month: number,
    amount: number,
  ) {
    const key = `${categoryId}:${periodKey({ year, month })}`;
    const existing = categoryMonthly.get(key);
    categoryMonthly.set(key, {
      categoryId,
      year,
      month,
      amount: (existing?.amount ?? 0) + amount,
    });
  }

  for (const row of plainCategoryRows) {
    addCategoryAmount(
      row.categoryId ?? UNCATEGORIZED_CATEGORY_ID,
      row.year,
      row.month,
      row.type === 'EXPENSE'
        ? row._sum.amount ?? 0
        : -(row._sum.amount ?? 0),
    );
  }

  for (const row of allocationRows) {
    addCategoryAmount(
      row.categoryId,
      row.transaction.year,
      row.transaction.month,
      row.transaction.type === 'EXPENSE'
        ? row.amount
        : -row.amount,
    );
  }

  const categoryIds = [
    ...new Set(
      [...categoryMonthly.values()]
        .map((row) => row.categoryId)
        .filter((id) => id !== UNCATEGORIZED_CATEGORY_ID),
    ),
  ];
  const categories =
    categoryIds.length === 0
      ? []
      : await prisma.category.findMany({
          where: { userId, id: { in: categoryIds } },
          select: { id: true, name: true, color: true, icon: true },
        });
  const categoryById = new Map<string, CategoryMeta>(
    categories.map((category) => [category.id, category]),
  );
  categoryById.set(UNCATEGORIZED_CATEGORY_ID, {
    id: UNCATEGORIZED_CATEGORY_ID,
    name: 'Sem categoria',
    color: '#64748B',
    icon: 'circle-help',
  });

  const netWorthPointA = netWorthA?.history.find(
    (point) =>
      point.year === input.a.to.year &&
      point.month === input.a.to.month,
  );
  const netWorthPointB = netWorthB?.history.find(
    (point) =>
      point.year === input.b.to.year &&
      point.month === input.b.to.month,
  );

  const a = aggregateSide({
    range: input.a,
    currency: input.currency,
    summaryRows,
    cardCreditRows,
    categoryMonthlyAmounts: [...categoryMonthly.values()],
    categoryById,
    netWorthEnd: netWorthPointA?.totals[input.currency] ?? null,
    netWorthStatus:
      netWorthAResult.status === 'rejected'
        ? 'ERROR'
        : netWorthPointA?.totals[input.currency] === undefined
          ? 'NO_DATA'
          : 'AVAILABLE',
    netWorthAsOf: netWorthAsOf(input.a.to, currentMonth, asOf),
  });
  const b = aggregateSide({
    range: input.b,
    currency: input.currency,
    summaryRows,
    cardCreditRows,
    categoryMonthlyAmounts: [...categoryMonthly.values()],
    categoryById,
    netWorthEnd: netWorthPointB?.totals[input.currency] ?? null,
    netWorthStatus:
      netWorthBResult.status === 'rejected'
        ? 'ERROR'
        : netWorthPointB?.totals[input.currency] === undefined
          ? 'NO_DATA'
          : 'AVAILABLE',
    netWorthAsOf: netWorthAsOf(input.b.to, currentMonth, asOf),
  });

  const aCategories = new Map(a.categories.map((item) => [item.id, item]));
  const bCategories = new Map(b.categories.map((item) => [item.id, item]));
  const comparisonCategoryIds = [
    ...new Set([...aCategories.keys(), ...bCategories.keys()]),
  ];

  return {
    currency: input.currency,
    asOf,
    coverage: {
      sameLength: a.months === b.months,
      overlaps: comparisonRangesOverlap(input.a, input.b),
    },
    netWorthMethodology: {
      basis: 'TRANSACTION_BALANCE',
      description:
        netWorthA?.historyValuation.description ??
        netWorthB?.historyValuation.description ??
        'Série contábil baseada em transações concluídas e passivos na data efetiva; não usa cotação atual para reconstruir mercado no passado.',
    },
    a,
    b,
    difference: {
      income: financialComparisonMetric(b.income, a.income),
      expense: financialComparisonMetric(b.expense, a.expense),
      balance: financialComparisonMetric(b.balance, a.balance),
      averageMonthlyIncome: financialComparisonMetric(
        b.averageMonthlyIncome,
        a.averageMonthlyIncome,
      ),
      averageMonthlyExpense: financialComparisonMetric(
        b.averageMonthlyExpense,
        a.averageMonthlyExpense,
      ),
      averageMonthlyBalance: financialComparisonMetric(
        b.averageMonthlyBalance,
        a.averageMonthlyBalance,
      ),
      netWorthEnd:
        a.netWorthEnd === null || b.netWorthEnd === null
          ? null
          : financialComparisonMetric(b.netWorthEnd, a.netWorthEnd),
    },
    categories: comparisonCategoryIds
      .map((id) => {
        const left = aCategories.get(id);
        const right = bCategories.get(id);
        const meta = right ?? left!;
        const aAmount = left?.amount ?? 0;
        const bAmount = right?.amount ?? 0;
        const aAverage = left?.averageMonthlyAmount ?? 0;
        const bAverage = right?.averageMonthlyAmount ?? 0;

        return {
          id,
          name: meta.name,
          color: meta.color,
          icon: meta.icon,
          a: {
            amount: aAmount,
            averageMonthlyAmount: aAverage,
          },
          b: {
            amount: bAmount,
            averageMonthlyAmount: bAverage,
          },
          difference: financialComparisonMetric(bAmount, aAmount),
          averageDifference: financialComparisonMetric(
            bAverage,
            aAverage,
          ),
        };
      })
      .sort(
        (left, right) =>
          Math.max(
            Math.abs(right.a.amount),
            Math.abs(right.b.amount),
          ) -
          Math.max(
            Math.abs(left.a.amount),
            Math.abs(left.b.amount),
          ),
      ),
  };
}

export async function getFinancialComparison(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = performance.now();

  function finish(
    response: NextResponse,
    context: LogContext = {},
    error?: unknown,
  ) {
    logServerOperation({
      event: 'financial_comparison',
      requestId,
      route: '/api/financial-comparison',
      status: response.status,
      startedAt,
      context,
      error,
    });
    return withRequestId(response, requestId);
  }

  try {
    const userId = await getAuthenticatedUserId();
    const params = new URL(request.url).searchParams;
    const currency = params.get('currency') ?? 'BRL';
    if (!isSupportedCurrency(currency)) {
      throw new HttpError('Moeda inválida', 400, 'INVALID_CURRENCY');
    }

    const a = rangeFromParams(params, 'a');
    const b = rangeFromParams(params, 'b');
    const data = await getFinancialComparisonForUser(userId, {
      a,
      b,
      currency,
    });

    return finish(success(data), {
      result: 'success',
      currency,
      aMonths: data.a.months,
      bMonths: data.b.months,
      overlappingRanges: data.coverage.overlaps,
    });
  } catch (error) {
    return finish(
      apiFailureFromError(error, {
        fallbackMessage: 'Erro ao comparar períodos',
        zodMessage: 'Parâmetros inválidos',
      }),
      { result: 'error' },
      error,
    );
  }
}
