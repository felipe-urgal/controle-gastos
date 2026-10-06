import { success } from "@/app/lib/api-response";
import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseQuery } from "@/app/lib/api/query";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import {
  consolidateCurrencyAmounts,
  latestRateOnOrBefore,
} from "@/app/lib/currency/exchange-rate-domain";
import { listExchangeRatesForPairsOnOrBefore } from "@/app/lib/currency/exchange-rates";
import {
  getLastDayOfMonth,
  logicalDateFromUtcInstant,
  type LogicalDate,
} from "@/app/lib/date/logical-date";
import { getInvestmentAccountValuesForUser } from "@/app/lib/investments/investment-account-valuation";
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
import type {
  NetWorthData,
  NetWorthValuationBasis,
  NetWorthValuationQuality,
} from "@/app/types/net-worth";

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

function logicalDateNumber(date: LogicalDate) {
  return date.year * 10_000 + date.month * 100 + date.day;
}

function monthEnd(period: { year: number; month: number }): LogicalDate {
  return {
    year: period.year,
    month: period.month,
    day: getLastDayOfMonth(period.year, period.month),
  };
}

function samePeriod(
  left: { year: number; month: number },
  right: { year: number; month: number },
) {
  return left.year === right.year && left.month === right.month;
}

function valuationBasisFromInvestmentSource(
  source: "MARKET" | "COST" | "MIXED",
): NetWorthValuationBasis {
  if (source === "MARKET") return "POSITION_MARKET";
  if (source === "COST") return "POSITION_COST";
  return "MIXED";
}

function aggregateValuationQuality(
  accounts: Array<NetWorthAccount & { balance: number }>,
  asOf: LogicalDate,
): NetWorthValuationQuality {
  const positionAccounts = accounts.filter(
    (account) => account.valuationBasis !== "TRANSACTION_BALANCE",
  );
  const basisSet = new Set(accounts.map((account) => account.valuationBasis));
  const positionCount = positionAccounts.reduce(
    (sum, account) => sum + (account.positionCount ?? 0),
    0,
  );
  const marketPositionCount = positionAccounts.reduce(
    (sum, account) => sum + (account.marketPositionCount ?? 0),
    0,
  );
  const costPositionCount = positionAccounts.reduce(
    (sum, account) => sum + (account.costPositionCount ?? 0),
    0,
  );
  const staleMarketPositionCount = positionAccounts.reduce(
    (sum, account) => sum + (account.staleMarketPositionCount ?? 0),
    0,
  );
  const quoteDates = positionAccounts.flatMap((account) =>
    [account.oldestQuoteReferenceAt, account.latestQuoteReferenceAt].filter(
      (value): value is string => Boolean(value),
    ),
  );
  const sortedQuoteDates = [...quoteDates].sort();

  return {
    basis:
      basisSet.size === 1
        ? ([...basisSet][0] ?? "TRANSACTION_BALANCE")
        : "MIXED",
    asOf,
    positionAccountCount: positionAccounts.length,
    positionCount,
    marketPositionCount,
    costPositionCount,
    staleMarketPositionCount,
    quoteCoveragePercentage:
      positionCount === 0
        ? 0
        : Math.round((marketPositionCount / positionCount) * 10_000) / 100,
    oldestQuoteReferenceAt: sortedQuoteDates[0] ?? null,
    latestQuoteReferenceAt: sortedQuoteDates.at(-1) ?? null,
    comparableToHistory: positionAccounts.length === 0,
  };
}

export async function getNetWorthForUser(
  userId: string,
  input: {
    year: number;
    month: number;
    months: number;
    baseCurrency?: SupportedCurrency;
    referenceNow?: Date;
  },
) {
  const end = { year: input.year, month: input.month };
  const periods = buildMonthlyPeriods(end, input.months);
  const start = periods[0] ?? end;
  const referenceNow = input.referenceNow ?? new Date();
  const today = logicalDateFromUtcInstant(referenceNow);
  const isCurrentPeriod = samePeriod(end, today);
  const asOf = isCurrentPeriod ? today : monthEnd(end);

  const [accounts, debts] = await Promise.all([
    prisma.account.findMany({
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
    }),
    prisma.debt.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        currency: true,
        institution: true,
        adjustments: {
          select: {
            newBalance: true,
            kind: true,
            transactionId: true,
            effectiveYear: true,
            effectiveMonth: true,
            effectiveDay: true,
            createdAt: true,
            id: true,
          },
        },
      },
      orderBy: [{ currency: "asc" }, { name: "asc" }, { id: "asc" }],
    }),
  ]);

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

  const adjustmentDate = (
    adjustment: (typeof eligibleDebts)[number]["adjustments"][number],
  ): LogicalDate => {
    if (
      adjustment.effectiveYear !== null &&
      adjustment.effectiveMonth !== null &&
      adjustment.effectiveDay !== null
    ) {
      return {
        year: adjustment.effectiveYear,
        month: adjustment.effectiveMonth,
        day: adjustment.effectiveDay,
      };
    }

    return logicalDateFromUtcInstant(adjustment.createdAt);
  };

  const balanceAtDate = (
    debt: (typeof eligibleDebts)[number],
    referenceDate: LogicalDate,
  ) => {
    const target = logicalDateNumber(referenceDate);
    const eligible = debt.adjustments
      .filter(
        (adjustment) => logicalDateNumber(adjustmentDate(adjustment)) <= target,
      )
      .sort((left, right) => {
        const dateDiff =
          logicalDateNumber(adjustmentDate(left)) -
          logicalDateNumber(adjustmentDate(right));
        if (dateDiff !== 0) return dateDiff;
        const createdDiff = left.createdAt.getTime() - right.createdAt.getTime();
        if (createdDiff !== 0) return createdDiff;
        return left.id.localeCompare(right.id);
      });

    return eligible.at(-1)?.newBalance ?? 0;
  };

  const accountIds = eligibleAccounts.map((account) => account.id);
  const endDayCutoff = isCurrentPeriod
    ? {
        NOT: {
          year: end.year,
          month: end.month,
          day: { gt: asOf.day },
        },
      }
    : {};

  const [openingRows, periodRows] =
    accountIds.length === 0
      ? ([[], []] as const)
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
              ...endDayCutoff,
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

  const normalizedAccounts: NetWorthAccount[] = eligibleAccounts.map(
    (account) => ({
      ...account,
      currency: account.currency as SupportedCurrency,
      valuationBasis: "TRANSACTION_BALANCE",
    }),
  );

  const assetHistory = buildNetWorthHistory({
    accounts: normalizedAccounts,
    openingRows,
    rows: periodRows,
    periods,
  });

  const transactionDistribution = buildNetWorthDistribution({
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

  const investmentAccountIds = eligibleAccounts
    .filter((account) => account.type === "INVESTMENT")
    .map((account) => account.id);
  const investmentValues = isCurrentPeriod
    ? await getInvestmentAccountValuesForUser(
        userId,
        investmentAccountIds,
        { asOf, now: referenceNow },
      )
    : new Map();

  const currentDistribution = transactionDistribution.map((account) => {
    if (account.type !== "INVESTMENT") return account;
    const investmentValue = investmentValues.get(account.id);
    if (!investmentValue) return account;

    return {
      ...account,
      cashBalance: account.balance,
      balance: investmentValue.valueCents,
      valuationBasis: valuationBasisFromInvestmentSource(
        investmentValue.source,
      ),
      positionCount: investmentValue.positionCount,
      marketPositionCount: investmentValue.marketPositionCount,
      costPositionCount: investmentValue.costPositionCount,
      staleMarketPositionCount: investmentValue.staleMarketPositionCount,
      quoteCoveragePercentage: investmentValue.quoteCoveragePercentage,
      oldestQuoteReferenceAt: investmentValue.oldestQuoteReferenceAt,
      latestQuoteReferenceAt: investmentValue.latestQuoteReferenceAt,
    };
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
    balance: balanceAtDate(debt, asOf),
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
    const pointAsOf =
      isCurrentPeriod && samePeriod(point, end) ? asOf : monthEnd(point);
    const liabilities = eligibleDebts.reduce(
      (result, debt) => {
        const balance = balanceAtDate(debt, pointAsOf);
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
        valuation: aggregateValuationQuality(accountsForCurrency, asOf),
        accounts: accountsForCurrency,
        debts: debtsForCurrency,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  let consolidation: NetWorthData["consolidation"] = null;

  if (input.baseCurrency) {
    const baseCurrency = input.baseCurrency;
    const consolidationItems = byCurrency.filter(
      (item) => item.total !== 0 || item.currency === baseCurrency,
    );
    const pairs = consolidationItems
      .filter(
        (item) => item.currency !== baseCurrency && item.total !== 0,
      )
      .map((item) => ({
        from: item.currency,
        to: baseCurrency,
      }));

    const storedRates = await listExchangeRatesForPairsOnOrBefore(
      userId,
      pairs,
      asOf,
      "SELL",
    );
    const selectedRates = pairs.flatMap((pair) => {
      const rate = latestRateOnOrBefore({
        rates: storedRates,
        from: pair.from,
        to: pair.to,
        referenceDate: asOf,
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
      referenceDate: asOf,
    };
  }

  return {
    end,
    asOf,
    months: input.months,
    periods,
    assetsTotals,
    liabilitiesTotals,
    totals,
    byCurrency,
    history,
    historyValuation: {
      basis: "TRANSACTION_BALANCE" as const,
      currentPointAsOf: asOf,
      description:
        "Série contábil baseada em transações concluídas e passivos na data efetiva; não usa cotação atual para reconstruir mercado no passado.",
    },
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
