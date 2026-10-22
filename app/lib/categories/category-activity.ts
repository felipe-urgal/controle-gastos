import { listCategoryMonthlyLimitsForUser } from "@/app/lib/category-limits/category-monthly-limits";
import type { LogicalDate } from "@/app/lib/date/logical-date";
import { prisma } from "@/app/lib/prisma";
import type { SupportedCurrency } from "@/app/types/financial-summary";

export const CATEGORY_HISTORY_MONTHS = 6;
export const CATEGORY_RECENT_LIMIT = 12;

export type CategoryHistoryPoint = { year: number; month: number; realized: number };

export type CategoryActivity = {
  /** Moeda dos números abaixo: a de maior movimento nos últimos meses (BRL sem movimento). */
  currency: SupportedCurrency;
  /** Moedas com movimento que ficaram de fora (os valores acima não as incluem). */
  otherCurrencies: SupportedCurrency[];
  month: {
    year: number;
    month: number;
    realized: number;
    committed: number;
    /** Limite do mês; null sem limite (e sempre null para receita). */
    limit: number | null;
  };
  /** Do mês mais antigo para o atual, sempre com 6 pontos. */
  history: CategoryHistoryPoint[];
  /** Média dos 5 meses anteriores ao atual; 0 sem histórico. */
  previousAverage: number;
  recent: Array<{
    id: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    status: "PENDING" | "COMPLETED";
    description: string;
    year: number;
    month: number;
    day: number;
    account: { id: string; name: string; currency: string };
  }>;
};

/** Os `count` meses terminando em `asOf`, do mais antigo para o atual. */
export function buildMonthWindow(asOf: Pick<LogicalDate, "year" | "month">, count = CATEGORY_HISTORY_MONTHS) {
  return Array.from({ length: count }, (_, index) => {
    const absolute = asOf.year * 12 + (asOf.month - 1) - (count - 1 - index);
    return { year: Math.floor(absolute / 12), month: (absolute % 12) + 1 };
  });
}

/** Soma por mês, preenchendo com zero os meses sem movimento. */
export function buildCategoryHistory(
  window: ReadonlyArray<{ year: number; month: number }>,
  rows: ReadonlyArray<{ year: number; month: number; amount: number }>,
): CategoryHistoryPoint[] {
  return window.map(({ year, month }) => ({
    year,
    month,
    realized: rows.filter((row) => row.year === year && row.month === month).reduce((sum, row) => sum + row.amount, 0),
  }));
}

export function previousAverage(history: readonly CategoryHistoryPoint[]) {
  const previous = history.slice(0, -1);
  if (previous.length === 0) return 0;
  return Math.round(previous.reduce((sum, point) => sum + point.realized, 0) / previous.length);
}

/** Moeda de maior valor movimentado; empate ou ausência cai em BRL. */
export function pickPrimaryCurrency(totalsByCurrency: ReadonlyMap<string, number>): SupportedCurrency {
  let best: string | null = null;
  for (const [currency, total] of totalsByCurrency) {
    if (best === null || total > (totalsByCurrency.get(best) ?? 0)) best = currency;
  }
  return (best ?? "BRL") as SupportedCurrency;
}

export async function getCategoryActivity(args: {
  userId: string;
  category: { id: string; type: "INCOME" | "EXPENSE" };
  asOf: LogicalDate;
}): Promise<CategoryActivity> {
  const { userId, category, asOf } = args;
  const window = buildMonthWindow(asOf);
  const periods = window.map(({ year, month }) => ({ year, month }));

  const [accounts, directRows, allocationRows, recent] = await Promise.all([
    prisma.account.findMany({ where: { userId }, select: { id: true, currency: true } }),
    prisma.transaction.groupBy({
      by: ["accountId", "year", "month"],
      where: {
        userId,
        categoryId: category.id,
        allocations: { none: {} },
        type: category.type,
        status: "COMPLETED",
        OR: periods,
      },
      _sum: { amount: true },
    }),
    prisma.transactionAllocation.findMany({
      where: {
        userId,
        categoryId: category.id,
        transaction: { is: { userId, type: category.type, status: "COMPLETED", OR: periods } },
      },
      select: { amount: true, transaction: { select: { year: true, month: true, accountId: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, categoryId: category.id, year: asOf.year, month: asOf.month, status: { not: "CANCELLED" } },
      orderBy: [{ day: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: CATEGORY_RECENT_LIMIT,
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        description: true,
        year: true,
        month: true,
        day: true,
        account: { select: { id: true, name: true, currency: true } },
      },
    }),
  ]);

  const currencyByAccount = new Map(accounts.map((account) => [account.id, account.currency]));
  const rows = [
    ...directRows.map((row) => ({ accountId: row.accountId, year: row.year, month: row.month, amount: row._sum.amount ?? 0 })),
    ...allocationRows.map((row) => ({ accountId: row.transaction.accountId, year: row.transaction.year, month: row.transaction.month, amount: row.amount })),
  ];

  const totalsByCurrency = new Map<string, number>();
  for (const row of rows) {
    const currency = currencyByAccount.get(row.accountId);
    if (currency) totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + row.amount);
  }
  const currency = pickPrimaryCurrency(totalsByCurrency);
  const otherCurrencies = [...totalsByCurrency.keys()].filter((code) => code !== currency) as SupportedCurrency[];

  const history = buildCategoryHistory(
    window,
    rows.filter((row) => currencyByAccount.get(row.accountId) === currency),
  );
  const current = history[history.length - 1];

  let committed = 0;
  let limit: number | null = null;
  let realized = current.realized;
  if (category.type === "EXPENSE") {
    const limits = await listCategoryMonthlyLimitsForUser(userId, asOf.year, asOf.month, currency);
    const item = limits.items.find((candidate) => candidate.category.id === category.id);
    if (item) {
      realized = item.realized;
      committed = item.committed;
      limit = item.limit?.amount ?? null;
    }
  }

  return {
    currency,
    otherCurrencies,
    month: { year: asOf.year, month: asOf.month, realized, committed, limit },
    history: history.map((point, index) => (index === history.length - 1 ? { ...point, realized } : point)),
    previousAverage: previousAverage(history),
    recent: recent as CategoryActivity["recent"],
  };
}
