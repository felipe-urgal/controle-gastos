import { withDerivedAccountBalances } from "@/app/lib/accounts/account-balance";
import {
  addLogicalDays,
  buildForecast,
  type ForecastResult,
} from "@/app/lib/forecast/forecast-engine";
import { buildCreditCardCommitments } from "@/app/lib/cards/credit-card-commitments";
import { compareLogicalDates } from "@/app/lib/date/logical-date";
import { prisma } from "@/app/lib/prisma";
import type { ForecastQueryInput } from "@/app/lib/forecast/forecast-schema";
import type { LogicalDate } from "@/app/lib/date/logical-date";

export type ForecastForUserResult = ForecastResult & {
  currency: ForecastQueryInput["currency"];
  cardCommitments: {
    overdue: ReturnType<typeof buildCreditCardCommitments>;
    upcoming: ReturnType<typeof buildCreditCardCommitments>;
  };
};

export function logicalDateFromUtcInstant(now: Date): LogicalDate {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Instante de referência inválido");
  }

  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
}

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

export async function getForecastForUser(
  userId: string,
  input: ForecastQueryInput,
  now: Date = new Date()
): Promise<ForecastForUserResult> {
  const asOf = logicalDateFromUtcInstant(now);
  const horizonEnd = addLogicalDays(asOf, input.days - 1);

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
    cardIds.length === 0
      ? [[], []] as const
      : await Promise.all([
          prisma.transaction.findMany({
            where: {
              userId,
              accountId: { in: cardIds },
              kind: "NORMAL",
              type: "EXPENSE",
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

  return {
    currency: input.currency,
    ...buildForecast({
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
    }),
    cardCommitments: {
      overdue: overdueCardCommitments,
      upcoming: upcomingCardCommitments,
    },
  };
}
