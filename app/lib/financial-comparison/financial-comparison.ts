import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { logicalDateFromUtcInstant } from '@/app/lib/date/logical-date';
import {
  enumerateComparisonMonths,
  financialComparisonMetric,
  isComparisonRangeInFuture,
  parseComparisonMonth,
} from '@/app/lib/financial-comparison/financial-comparison-domain';
import { HttpError } from '@/app/lib/http-error';
import { getNetWorthForUser } from '@/app/lib/net-worth/net-worth';
import { prisma } from '@/app/lib/prisma';
import { isSupportedCurrency, type SupportedCurrency } from '@/app/types/financial-summary';
import type { ComparisonRange, FinancialComparisonData, FinancialComparisonSide } from '@/app/types/financial-comparison';

function rangeFromParams(params: URLSearchParams, prefix: 'a' | 'b'): ComparisonRange {
  const from = parseComparisonMonth(params.get(`${prefix}From`) ?? '');
  const to = parseComparisonMonth(params.get(`${prefix}To`) ?? '');
  if (!from || !to) throw new HttpError('Período de comparação inválido', 400, 'INVALID_COMPARISON_PERIOD');
  return { from, to };
}

async function aggregateComparisonSide(
  userId: string,
  range: ComparisonRange,
  currency: SupportedCurrency,
): Promise<FinancialComparisonSide> {
  const periods = enumerateComparisonMonths(range);
  const periodFilter = periods.map(({ year, month }) => ({ year, month }));

  const [summaryRows, plainCategoryRows, allocationRows, netWorth] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        kind: 'NORMAL',
        status: 'COMPLETED',
        OR: periodFilter,
        account: { is: { userId, currency } },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        kind: 'NORMAL',
        type: 'EXPENSE',
        status: 'COMPLETED',
        allocations: { none: {} },
        OR: periodFilter,
        account: { is: { userId, currency } },
      },
      _sum: { amount: true },
    }),
    prisma.transactionAllocation.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        transaction: {
          is: {
            userId,
            kind: 'NORMAL',
            type: 'EXPENSE',
            status: 'COMPLETED',
            OR: periodFilter,
            account: { is: { userId, currency } },
          },
        },
      },
      _sum: { amount: true },
    }),
    getNetWorthForUser(userId, { year: range.to.year, month: range.to.month, months: 1 }),
  ]);

  let income = 0;
  let expense = 0;
  for (const row of summaryRows) {
    if (row.type === 'INCOME') income = row._sum.amount ?? 0;
    if (row.type === 'EXPENSE') expense = row._sum.amount ?? 0;
  }

  const amountByCategory = new Map<string, number>();
  for (const row of plainCategoryRows) {
    if (row.categoryId) amountByCategory.set(row.categoryId, row._sum.amount ?? 0);
  }
  for (const row of allocationRows) {
    amountByCategory.set(row.categoryId, (amountByCategory.get(row.categoryId) ?? 0) + (row._sum.amount ?? 0));
  }

  const categoryIds = [...amountByCategory.keys()];
  const categories = categoryIds.length === 0 ? [] : await prisma.category.findMany({
    where: { userId, id: { in: categoryIds } },
    select: { id: true, name: true, color: true, icon: true },
  });
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return {
    range,
    months: periods.length,
    income,
    expense,
    balance: income - expense,
    averageMonthlyExpense: Math.round(expense / periods.length),
    netWorthEnd: netWorth.totals[currency] ?? null,
    categories: [...amountByCategory.entries()]
      .flatMap(([id, amount]) => {
        const category = categoryById.get(id);
        return category ? [{ ...category, amount }] : [];
      })
      .sort((left, right) => right.amount - left.amount),
  };
}

export async function getFinancialComparisonForUser(
  userId: string,
  input: { a: ComparisonRange; b: ComparisonRange; currency: SupportedCurrency },
): Promise<FinancialComparisonData> {
  const [a, b] = await Promise.all([
    aggregateComparisonSide(userId, input.a, input.currency),
    aggregateComparisonSide(userId, input.b, input.currency),
  ]);

  const aCategories = new Map(a.categories.map((item) => [item.id, item]));
  const bCategories = new Map(b.categories.map((item) => [item.id, item]));
  const categoryIds = [...new Set([...aCategories.keys(), ...bCategories.keys()])];

  return {
    currency: input.currency,
    a,
    b,
    difference: {
      income: financialComparisonMetric(b.income, a.income),
      expense: financialComparisonMetric(b.expense, a.expense),
      balance: financialComparisonMetric(b.balance, a.balance),
      averageMonthlyExpense: financialComparisonMetric(b.averageMonthlyExpense, a.averageMonthlyExpense),
      netWorthEnd:
        a.netWorthEnd === null || b.netWorthEnd === null
          ? null
          : financialComparisonMetric(b.netWorthEnd, a.netWorthEnd),
    },
    categories: categoryIds
      .map((id) => {
        const left = aCategories.get(id);
        const right = bCategories.get(id);
        const meta = right ?? left!;
        const aAmount = left?.amount ?? 0;
        const bAmount = right?.amount ?? 0;
        return {
          id,
          name: meta.name,
          color: meta.color,
          icon: meta.icon,
          a: aAmount,
          b: bAmount,
          difference: financialComparisonMetric(bAmount, aAmount),
        };
      })
      .sort((left, right) => Math.max(right.a, right.b) - Math.max(left.a, left.b)),
  };
}

export async function getFinancialComparison(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const params = new URL(request.url).searchParams;
    const currency = params.get('currency') ?? 'BRL';
    if (!isSupportedCurrency(currency)) throw new HttpError('Moeda inválida', 400, 'INVALID_CURRENCY');

    const a = rangeFromParams(params, 'a');
    const b = rangeFromParams(params, 'b');

    try {
      enumerateComparisonMonths(a);
      enumerateComparisonMonths(b);
    } catch (cause) {
      throw new HttpError(
        cause instanceof Error ? cause.message : 'Período de comparação inválido',
        400,
        'INVALID_COMPARISON_PERIOD',
      );
    }

    const asOf = logicalDateFromUtcInstant(new Date());
    const currentMonth = { year: asOf.year, month: asOf.month };
    if (isComparisonRangeInFuture(a, currentMonth) || isComparisonRangeInFuture(b, currentMonth)) {
      throw new HttpError(
        'Períodos futuros não podem ser comparados como realizado',
        400,
        'FUTURE_COMPARISON_PERIOD',
      );
    }

    return success(await getFinancialComparisonForUser(userId, { a, b, currency }));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao comparar períodos',
      zodMessage: 'Parâmetros inválidos',
    });
  }
}
