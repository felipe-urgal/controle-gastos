import { withDerivedAccountBalances } from "@/app/lib/accounts/account-balance";
import {
  addLogicalDays,
  buildForecast,
  type ForecastResult,
} from "@/app/lib/forecast/forecast-engine";
import { buildCreditCardCommitments } from "@/app/lib/cards/credit-card-commitments";
import {
  compareLogicalDates,
  logicalDateFromUtcInstant,
} from "@/app/lib/date/logical-date";
import { prisma } from "@/app/lib/prisma";
import { buildSafeToSpend } from "@/app/lib/forecast/safe-to-spend";
import type { ForecastQueryInput } from "@/app/lib/forecast/forecast-schema";
import type { LogicalDate } from "@/app/lib/date/logical-date";

export type ForecastForUserResult = ForecastResult & {
  currency: ForecastQueryInput["currency"];
  cardCommitments: {
    overdue: ReturnType<typeof buildCreditCardCommitments>;
    upcoming: ReturnType<typeof buildCreditCardCommitments>;
  };
  safeToSpend: ReturnType<typeof buildSafeToSpend> & {
    /** Último dia considerado: pendências e faturas posteriores a ele ficam de fora. */
    through: LogicalDate;
  };
};

export { logicalDateFromUtcInstant } from "@/app/lib/date/logical-date";

function shiftLogicalMonth(date: LogicalDate, offset: number) {
  const value = new Date(Date.UTC(date.year, date.month - 1 + offset, 1));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
  };
}

function monthWindow(start: LogicalDate, end: LogicalDate) {
  const periods: Array<{ year: number; month: number }> = [];
  let current = { year: start.year, month: start.month };

  while (
    current.year < end.year ||
    (current.year === end.year && current.month <= end.month)
  ) {
    periods.push(current);
    current = shiftLogicalMonth(
      { year: current.year, month: current.month, day: 1 },
      1,
    );
  }

  return periods;
}

/** Último dia do mês de `date`. */
export function lastDayOfMonth(date: LogicalDate): LogicalDate {
  const day = new Date(Date.UTC(date.year, date.month, 0)).getUTCDate();
  return { year: date.year, month: date.month, day };
}

export async function getForecastForUser(
  userId: string,
  input: ForecastQueryInput,
  now: Date = new Date(),
  options: {
    /** Limita o "disponível para gastar" a esta data (padrão: fim do horizonte). */
    safeToSpendThrough?: LogicalDate;
  } = {},
): Promise<ForecastForUserResult> {
  const asOf = logicalDateFromUtcInstant(now);
  const horizonEnd = addLogicalDays(asOf, input.days - 1);
  const safeToSpendThrough = options.safeToSpendThrough ?? horizonEnd;

  const [accounts, cards] = await Promise.all([
    prisma.account.findMany({
      where: {
        userId,
        isActive: true,
        currency: input.currency,
        type: { not: "CREDIT_CARD" },
      },
    select: {
      id: true,
      name: true,
      type: true,
    },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    prisma.account.findMany({
      where: {
        userId,
        isActive: true,
        currency: input.currency,
        type: "CREDIT_CARD",
      },
      select: {
        id: true,
        name: true,
        statementClosingDay: true,
        statementDueDay: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
  ]);

  const accountsWithBalances = await withDerivedAccountBalances(accounts, userId);
  const accountIds = accountsWithBalances.map((account) => account.id);

  const transactions =
    accountIds.length === 0
      ? []
      : await prisma.transaction.findMany({
          where: {
            userId,
            status: "PENDING",
            accountId: { in: accountIds },
            account: {
              is: {
                userId,
                isActive: true,
                currency: input.currency,
              },
            },
          },
          select: {
            id: true,
            accountId: true,
            amount: true,
            type: true,
            kind: true,
            status: true,
            description: true,
            series: {
              select: {
                type: true,
              },
            },
            year: true,
            month: true,
            day: true,
          },
          orderBy: [
            { year: "asc" },
            { month: "asc" },
            { day: "asc" },
            { id: "asc" },
          ],
        });

  const cardIds = cards.map((card) => card.id);
  const firstStatementMonth = shiftLogicalMonth(asOf, -24);
  const lastStatementMonth = shiftLogicalMonth(horizonEnd, 2);
  const statementPeriods = monthWindow(
    { ...firstStatementMonth, day: 1 },
    { ...lastStatementMonth, day: 1 },
  );

  const [cardTransactions, cardPayments] =
    await Promise.all([
          prisma.transaction.findMany({
            where: {
              userId,
              accountId: { in: cardIds },
              kind: "NORMAL",
              status: { not: "CANCELLED" },
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
              { year: "asc" },
              { month: "asc" },
              { day: "asc" },
              { id: "asc" },
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

  const transactionsByCard = new Map<string, typeof cardTransactions>();
  for (const transaction of cardTransactions) {
    const list = transactionsByCard.get(transaction.accountId) ?? [];
    list.push(transaction);
    transactionsByCard.set(transaction.accountId, list);
  }

  const cardCommitments = buildCreditCardCommitments({
    asOf,
    historyLimit: 24,
    cards: cards.flatMap((card) =>
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
  const overdueCardCommitments = cardCommitments.filter(
    (commitment) => compareLogicalDates(commitment.dueDate, asOf) < 0,
  );
  const upcomingCardCommitments = cardCommitments.filter(
    (commitment) =>
      compareLogicalDates(commitment.dueDate, asOf) >= 0 &&
      compareLogicalDates(commitment.dueDate, horizonEnd) <= 0,
  );
  const safeToSpendCardCommitments = cardCommitments.filter(
    (commitment) =>
      compareLogicalDates(commitment.dueDate, asOf) < 0 ||
      compareLogicalDates(commitment.dueDate, safeToSpendThrough) <= 0,
  );

  const forecast = buildForecast({
    asOf,
    horizonDays: input.days,
    accounts: accountsWithBalances.map((account) => ({
      id: account.id,
      name: account.name,
      balance: account.balance,
    })),
    transactions: transactions.map(({ series, ...transaction }) => ({
      ...transaction,
      seriesType: series?.type ?? null,
    })),
  });
  // O horizonte do cálculo é 30/60/90 dias; o corte exato do "disponível" é feito pela data.
  const safeToSpendHorizon =
    compareLogicalDates(safeToSpendThrough, horizonEnd) <= 0
      ? forecast
      : buildForecast({
          asOf,
          horizonDays: 60,
          accounts: accountsWithBalances.map((account) => ({
            id: account.id,
            name: account.name,
            balance: account.balance,
          })),
          transactions: transactions.map(({ series, ...transaction }) => ({
            ...transaction,
            seriesType: series?.type ?? null,
          })),
        });
  const safeToSpend = buildSafeToSpend({
    forecast: {
      ...safeToSpendHorizon,
      upcoming: safeToSpendHorizon.upcoming.filter(
        (item) => compareLogicalDates(item, safeToSpendThrough) <= 0,
      ),
    },
    accountTypes: new Map(
      accountsWithBalances.map((account) => [
        account.id,
        account.type === "INVESTMENT" ? "INVESTMENT" : "CREDIT_DEBIT",
      ] as const),
    ),
    cardCommitments: safeToSpendCardCommitments,
  });

  return {
    currency: input.currency,
    ...forecast,
    cardCommitments: {
      overdue: overdueCardCommitments,
      upcoming: upcomingCardCommitments,
    },
    safeToSpend: { ...safeToSpend, through: safeToSpendThrough },
  };
}
