import {
  compareLogicalDates,
  logicalDateFromUtcInstant,
} from '@/app/lib/date/logical-date';
import { addLogicalDays } from '@/app/lib/forecast/forecast-engine';
import { getForecastForUser } from '@/app/lib/forecast/forecast';
import {
  isFinancialCommitmentInRange,
  isFinancialCommitmentVisible,
  sortFinancialCommitments,
  summarizeFinancialCommitments,
} from '@/app/lib/commitments/financial-commitments-domain';
import { prisma } from '@/app/lib/prisma';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  FinancialCommitment,
  FinancialCommitmentsData,
} from '@/app/types/financial-commitment';

export async function getFinancialCommitmentsForUser(
  userId: string,
  input: {
    currency: SupportedCurrency;
    days: 7 | 30 | 60 | 90;
  },
  now: Date = new Date(),
): Promise<FinancialCommitmentsData> {
  const asOf = logicalDateFromUtcInstant(now);
  const through = addLogicalDays(asOf, input.days - 1);
  const forecastDays = input.days === 7 ? 30 : input.days;

  const forecast = await getForecastForUser(
    userId,
    { currency: input.currency, days: forecastDays },
    now,
  );

  const [goals, debts] = await Promise.all([
    prisma.financialGoal.findMany({
      where: {
        userId,
        currency: input.currency,
        status: 'ACTIVE',
        targetYear: { not: null },
        targetMonth: { not: null },
        targetDay: { not: null },
      },
      select: {
        id: true,
        name: true,
        targetYear: true,
        targetMonth: true,
        targetDay: true,
      },
      orderBy: [{ targetYear: 'asc' }, { targetMonth: 'asc' }, { targetDay: 'asc' }],
    }),
    prisma.debt.findMany({
      where: {
        userId,
        currency: input.currency,
        status: 'ACTIVE',
        installmentAmount: { not: null },
        dueYear: { not: null },
        dueMonth: { not: null },
        dueDay: { not: null },
      },
      select: {
        id: true,
        name: true,
        installmentAmount: true,
        dueYear: true,
        dueMonth: true,
        dueDay: true,
        institution: true,
      },
      orderBy: [{ dueYear: 'asc' }, { dueMonth: 'asc' }, { dueDay: 'asc' }],
    }),
  ]);

  const transactionItems: FinancialCommitment[] = [
    ...forecast.overdue,
    ...forecast.upcoming,
  ]
    .filter((item) => item.kind === 'NORMAL')
    .filter((item) => {
      const date = { year: item.year, month: item.month, day: item.day };
      return compareLogicalDates(date, asOf) < 0 ||
        isFinancialCommitmentInRange(date, asOf, through);
    })
    .map((item) => {
      const date = { year: item.year, month: item.month, day: item.day };
      return {
        id: `transaction:${item.id}`,
        type:
          item.seriesType === 'RECURRING'
            ? 'RECURRING'
            : item.seriesType === 'INSTALLMENT'
              ? 'INSTALLMENT'
              : 'PENDING',
        direction: item.type === 'INCOME' ? 'RECEIVABLE' : 'PAYABLE',
        state: compareLogicalDates(date, asOf) < 0 ? 'OVERDUE' : 'UPCOMING',
        title: item.description,
        amount: item.amount,
        currency: input.currency,
        date,
        href: `/transacoes/show/${item.id}`,
        accountName:
          forecast.accounts.find((account) => account.id === item.accountId)?.name ?? null,
        source: { kind: 'TRANSACTION', id: item.id },
      } satisfies FinancialCommitment;
    });

  const cardItems: FinancialCommitment[] = [
    ...forecast.cardCommitments.overdue,
    ...forecast.cardCommitments.upcoming,
  ]
    .filter((item) =>
      compareLogicalDates(item.dueDate, asOf) < 0 ||
      isFinancialCommitmentInRange(item.dueDate, asOf, through),
    )
    .map((item) => ({
      id: `card:${item.cardId}:${item.closingDate.year}-${item.closingDate.month}`,
      type: 'CARD_STATEMENT',
      direction: 'PAYABLE',
      state: compareLogicalDates(item.dueDate, asOf) < 0 ? 'OVERDUE' : 'UPCOMING',
      title: `Fatura · ${item.cardName}`,
      amount: item.amount,
      currency: input.currency,
      date: item.dueDate,
      href: `/contas/show/${item.cardId}`,
      accountName: item.cardName,
      source: { kind: 'CARD', id: item.cardId },
    }));

  const debtItems: FinancialCommitment[] = debts.flatMap((debt) => {
    if (
      debt.installmentAmount === null ||
      debt.dueYear === null ||
      debt.dueMonth === null ||
      debt.dueDay === null
    ) {
      return [];
    }

    const date = {
      year: debt.dueYear,
      month: debt.dueMonth,
      day: debt.dueDay,
    };
    if (!isFinancialCommitmentVisible(date, through)) return [];

    return [{
      id: `debt:${debt.id}`,
      type: 'DEBT_INSTALLMENT' as const,
      direction: 'PAYABLE' as const,
      state: compareLogicalDates(date, asOf) < 0 ? 'OVERDUE' as const : 'UPCOMING' as const,
      title: `Parcela · ${debt.name}`,
      amount: debt.installmentAmount,
      currency: input.currency,
      date,
      href: '/dividas',
      accountName: debt.institution,
      source: { kind: 'DEBT' as const, id: debt.id },
    }];
  });

  const goalItems: FinancialCommitment[] = goals.flatMap((goal) => {
    if (
      goal.targetYear === null ||
      goal.targetMonth === null ||
      goal.targetDay === null
    ) {
      return [];
    }

    const date = {
      year: goal.targetYear,
      month: goal.targetMonth,
      day: goal.targetDay,
    };
    if (!isFinancialCommitmentVisible(date, through)) return [];

    return [{
      id: `goal:${goal.id}`,
      type: 'GOAL_DEADLINE' as const,
      direction: 'MILESTONE' as const,
      state: compareLogicalDates(date, asOf) < 0 ? 'OVERDUE' as const : 'UPCOMING' as const,
      title: `Prazo da meta · ${goal.name}`,
      amount: null,
      currency: input.currency,
      date,
      href: '/metas',
      accountName: null,
      source: { kind: 'GOAL' as const, id: goal.id },
    }];
  });

  const items = sortFinancialCommitments([
    ...transactionItems,
    ...cardItems,
    ...debtItems,
    ...goalItems,
  ]);

  return {
    asOf,
    through,
    currency: input.currency,
    days: input.days,
    items,
    totals: summarizeFinancialCommitments(items),
  };
}
