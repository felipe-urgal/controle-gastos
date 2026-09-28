import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import {
  consolidateCurrencyAmounts,
  latestRateOnOrBefore,
} from "@/app/lib/currency/exchange-rate-domain";
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

function queryFromRequest(request: Request) {
  const url = new URL(request.url);
  return netWorthQuerySchema.parse({
    year: url.searchParams.get("year"),
    month: url.searchParams.get("month"),
    months: url.searchParams.get("months") ?? undefined,
    consolidateTo: url.searchParams.get("consolidateTo") ?? undefined,
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
    consolidateTo?: SupportedCurrency;
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

  const history = buildNetWorthHistory({
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

  const totals = currentDistribution.reduce(
    (result, account) => {
      result[account.currency] =
        (result[account.currency] ?? 0) + account.balance;
      return result;
    },
    {} as Partial<Record<SupportedCurrency, number>>,
  );

  const byCurrency = (["BRL", "USD", "EUR"] as const)
    .map((currency) => {
      const accountsForCurrency = currentDistribution.filter(
        (account) => account.currency === currency,
      );
      if (accountsForCurrency.length === 0) return null;

      return {
        currency,
        total: totals[currency] ?? 0,
        accounts: accountsForCurrency,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  let consolidation = null;

  if (input.consolidateTo) {
    const referenceDate = {
      year: input.year,
      month: input.month,
      day: new Date(Date.UTC(input.year, input.month, 0)).getUTCDate(),
    };

    const sourceCurrencies = byCurrency
      .map((item) => item.currency)
      .filter((currency) => currency !== input.consolidateTo);

    const storedRates =
      sourceCurrencies.length === 0
        ? []
        : await prisma.exchangeRate.findMany({
            where: {
              userId,
              source: "MANUAL",
              toCurrency: input.consolidateTo,
              fromCurrency: { in: sourceCurrencies },
            },
            orderBy: [
              { referenceYear: "desc" },
              { referenceMonth: "desc" },
              { referenceDay: "desc" },
              { id: "asc" },
            ],
          });

    const mappedRates = storedRates.flatMap((rate) => {
      if (
        (rate.fromCurrency !== "BRL" &&
          rate.fromCurrency !== "USD" &&
          rate.fromCurrency !== "EUR") ||
        (rate.toCurrency !== "BRL" &&
          rate.toCurrency !== "USD" &&
          rate.toCurrency !== "EUR")
      ) {
        return [];
      }

      return [{
        from: rate.fromCurrency,
        to: rate.toCurrency,
        numerator: rate.numerator,
        denominator: rate.denominator,
        source: "MANUAL" as const,
        referenceDate: {
          year: rate.referenceYear,
          month: rate.referenceMonth,
          day: rate.referenceDay,
        },
      }];
    });

    const selectedRates = sourceCurrencies.flatMap((from) => {
      const rate = latestRateOnOrBefore({
        rates: mappedRates,
        from,
        to: input.consolidateTo!,
        referenceDate,
      });
      return rate ? [rate] : [];
    });

    consolidation = {
      ...consolidateCurrencyAmounts({
        items: byCurrency.map((item) => ({
          amount: item.total,
          currency: item.currency,
        })),
        baseCurrency: input.consolidateTo,
        rates: selectedRates,
      }),
      referenceDate,
    };
  }

  return {
    end,
    months: input.months,
    periods,
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
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Parâmetros inválidos", 400);
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao carregar patrimônio", 500);
  }
}
