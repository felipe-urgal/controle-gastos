import { success } from "@/app/lib/api-response";
import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseQuery } from "@/app/lib/api/query";
import {
  consolidateCurrencyAmounts,
  latestRateOnOrBefore,
} from "@/app/lib/currency/exchange-rate-domain";
import { listExchangeRatesForUser } from "@/app/lib/currency/exchange-rates";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import {
  buildMonthlyPeriods,
  buildNetWorthDistribution,
  buildNetWorthHistory,
  shiftPeriod,
  type NetWorthAccount,
} from "@/app/lib/net-worth/net-worth-domain";
import { netWorthQuerySchema } from "@/app/lib/net-worth/net-worth-schema";
import { prisma } from "@/app/lib/prisma";
import type { SupportedCurrency } from "@/app/types/financial-summary";
import type { NetWorthData } from "@/app/types/net-worth";

function queryFromRequest(request: Request) {
  return parseQuery(request, netWorthQuerySchema, {
    year: null,
    month: null,
    months: undefined,
    baseCurrency: undefined,
  });
}

function beforePeriodFilter(period: { year: number; month: number }) {
  return {
    OR: [
      { year: { lt: period.year } },
      { year: period.year, month: { lt: period.month } },
    ],
  };
}

function periodRangeFilter(
  start: { year: number; month: number },
  end: { year: number; month: number },
) {
  if (start.year === end.year) {
    return {
      year: start.year,
      month: { gte: start.month, lte: end.month },
    };
  }

  return {
    OR: [
      { year: start.year, month: { gte: start.month } },
      { year: { gt: start.year, lt: end.year } },
      { year: end.year, month: { lte: end.month } },
    ],
  };
}

export async function getNetWorthForUser(
  userId: string,
  input: {
    year: number;
    month: number;
    months: number;
    baseCurrency?: SupportedCurrency;
  },
) {
  const end = { year: input.year, month: input.month };
  const periods = buildMonthlyPeriods(end, input.months);
  const start = periods[0] ?? end;

  const accounts = await prisma.account.findMany({
    where: {
      userId,
      type: { in: ["CREDIT_DEBIT", "INVESTMENT"] },
    },
    select: {
      id: true,
      name: true,
      type: true,
      currency: true,
      isActive: true,
      color: true,
      icon: true,
    },
    orderBy: [
      { currency: "asc" },
      { type: "asc" },
      { isActive: "desc" },
      { name: "asc" },
    ],
  });

  const debts = await prisma.debt.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      currency: true,
      institution: true,
      adjustments: {
        select: {
          newBalance: true,
          createdAt: true,
          id: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
    orderBy: [{ currency: "asc" }, { name: "asc" }, { id: "asc" }],
  });

  const eligibleAccounts = accounts.filter(
    (
      account,
    ): account is typeof account & {
      type: "CREDIT_DEBIT" | "INVESTMENT";
      currency: SupportedCurrency;
    } =>
      (account.type === "CREDIT_DEBIT" || account.type === "INVESTMENT") &&
      (account.currency === "BRL" ||
        account.currency === "USD" ||
        account.currency === "EUR"),
  );

  const eligibleDebts = debts.filter(
    (
      debt,
    ): debt is typeof debt & {
      currency: SupportedCurrency;
    } =>
      debt.currency === "BRL" ||
      debt.currency === "USD" ||
      debt.currency === "EUR",
  );

  const balanceAtPeriodEnd = (
    debt: (typeof eligibleDebts)[number],
    period: { year: number; month: number },
  ) => {
    const endExclusive = new Date(Date.UTC(period.year, period.month, 1));
    let balance = 0;
    for (const adjustment of debt.adjustments) {
      if (adjustment.createdAt >= endExclusive) break;
      balance = adjustment.newBalance;
    }
    return balance;
  };

  const accountIds = eligibleAccounts.map((account) => account.id);

  const [openingRows, periodRows] =
    accountIds.length === 0
      ? [[], []] as const
      : await Promise.all([
          prisma.transaction.groupBy({
            by: ["accountId", "type"],
            where: {
              userId,
              accountId: { in: accountIds },
              status: "COMPLETED",
              account: {
                is: {
                  userId,
                  type: { in: ["CREDIT_DEBIT", "INVESTMENT"] },
                },
              },
              ...beforePeriodFilter(start),
            },
            _sum: { amount: true },
          }),
          prisma.transaction.groupBy({
            by: ["accountId", "year", "month", "type"],
            where: {
              userId,
              accountId: { in: accountIds },
              status: "COMPLETED",
              account: {
                is: {
                  userId,
                  type: { in: ["CREDIT_DEBIT", "INVESTMENT"] },
                },
              },
              ...periodRangeFilter(start, end),
            },
            _sum: { amount: true },
            orderBy: [
              { year: "asc" },
              { month: "asc" },
              { accountId: "asc" },
              { type: "asc" },
            ],
          }),
        ]);

  const normalizedAccounts: NetWorthAccount[] = eligibleAccounts.map((account) => ({
    ...account,
    currency: account.currency as SupportedCurrency,
  }));

  const assetHistory = buildNetWorthHistory({
    accounts: normalizedAccounts,
    openingRows,
    rows: periodRows,
    periods,
  });

  const currentDistribution = buildNetWorthDistribution({
    accounts: normalizedAccounts,
    rows: [
      ...openingRows.map((row) => ({
        ...row,
        year: shiftPeriod(start, -1).year,
        month: shiftPeriod(start, -1).month,
      })),
      ...periodRows,
    ],
  });

  const assetsTotals = currentDistribution.reduce(
    (result, account) => {
      result[account.currency] =
        (result[account.currency] ?? 0) + account.balance;
      return result;
    },
    {} as Partial<Record<SupportedCurrency, number>>,
  );

  const debtBalances = eligibleDebts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    currency: debt.currency,
    institution: debt.institution,
    balance: balanceAtPeriodEnd(debt, end),
  }));

  const liabilitiesTotals = debtBalances.reduce(
    (result, debt) => {
      if (debt.balance > 0) {
        result[debt.currency] = (result[debt.currency] ?? 0) + debt.balance;
      }
      return result;
    },
    {} as Partial<Record<SupportedCurrency, number>>,
  );

  const totals = (["BRL", "USD", "EUR"] as const).reduce(
    (result, currency) => {
      const assets = assetsTotals[currency] ?? 0;
      const liabilities = liabilitiesTotals[currency] ?? 0;
      if (
        Object.prototype.hasOwnProperty.call(assetsTotals, currency) ||
        Object.prototype.hasOwnProperty.call(liabilitiesTotals, currency)
      ) {
        result[currency] = assets - liabilities;
      }
      return result;
    },
    {} as Partial<Record<SupportedCurrency, number>>,
  );

  const history = assetHistory.map((point) => {
    const liabilities = eligibleDebts.reduce(
      (result, debt) => {
        const balance = balanceAtPeriodEnd(debt, point);
        if (balance > 0) {
          result[debt.currency] = (result[debt.currency] ?? 0) + balance;
        }
        return result;
      },
      {} as Partial<Record<SupportedCurrency, number>>,
    );

    const netTotals = (["BRL", "USD", "EUR"] as const).reduce(
      (result, currency) => {
        const assets = point.totals[currency] ?? 0;
        const debtTotal = liabilities[currency] ?? 0;
        if (
          Object.prototype.hasOwnProperty.call(point.totals, currency) ||
          Object.prototype.hasOwnProperty.call(liabilities, currency)
        ) {
          result[currency] = assets - debtTotal;
        }
        return result;
      },
      {} as Partial<Record<SupportedCurrency, number>>,
    );

    return { ...point, totals: netTotals };
  });

  const byCurrency = (["BRL", "USD", "EUR"] as const)
    .map((currency) => {
      const accountsForCurrency = currentDistribution.filter(
        (account) => account.currency === currency,
      );
      const debtsForCurrency = debtBalances.filter(
        (debt) => debt.currency === currency && debt.balance > 0,
      );
      if (accountsForCurrency.length === 0 && debtsForCurrency.length === 0) {
        return null;
      }

      return {
        currency,
        assetsTotal: assetsTotals[currency] ?? 0,
        liabilitiesTotal: liabilitiesTotals[currency] ?? 0,
        total: totals[currency] ?? 0,
        accounts: accountsForCurrency,
        debts: debtsForCurrency,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  let consolidation: NetWorthData["consolidation"] = null;

  if (input.baseCurrency) {
    const baseCurrency = input.baseCurrency;
    const referenceDateValue = new Date(
      Date.UTC(end.year, end.month, 0),
    );
    const referenceDate = {
      year: referenceDateValue.getUTCFullYear(),
      month: referenceDateValue.getUTCMonth() + 1,
      day: referenceDateValue.getUTCDate(),
    };

    const storedRates = await listExchangeRatesForUser(userId);
    const consolidationItems = byCurrency.filter(
      (item) => item.total !== 0 || item.currency === baseCurrency,
    );

    const selectedRates = consolidationItems.flatMap((item) => {
      if (item.currency === baseCurrency || item.total === 0) return [];

      const rate = latestRateOnOrBefore({
        rates: storedRates.items,
        from: item.currency,
        to: baseCurrency,
        referenceDate,
      });

      return rate ? [rate] : [];
    });

    consolidation = {
      ...consolidateCurrencyAmounts({
        items: consolidationItems.map((item) => ({
          amount: item.total,
          currency: item.currency,
        })),
        baseCurrency,
        rates: selectedRates,
      }),
      referenceDate,
    };
  }

  return {
    end,
    months: input.months,
    periods,
    assetsTotals,
    liabilitiesTotals,
    totals,
    byCurrency,
    history,
    consolidation,
  };
}

export async function getNetWorth(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = queryFromRequest(request);
    return success(await getNetWorthForUser(userId, input));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao carregar patrimônio",
      zodMessage: "Parâmetros inválidos",
    });
  }
}
