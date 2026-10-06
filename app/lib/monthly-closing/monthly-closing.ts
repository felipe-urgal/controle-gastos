import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { parseQuery } from '@/app/lib/api/query';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { buildCreditCardStatements } from '@/app/lib/cards/credit-card-statements';
import {
  compareLogicalDates,
  getLastDayOfMonth,
  logicalDateFromUtcInstant,
  type LogicalDate,
} from '@/app/lib/date/logical-date';
import { dashboardPeriodSchema } from '@/app/lib/dashboard/dashboard-schema';
import {
  getMonthlyDashboardForUser,
  shiftDashboardPeriod,
} from '@/app/lib/dashboard/monthly-dashboard';
import { getNetWorthForUser } from '@/app/lib/net-worth/net-worth';
import {
  deriveMonthlyClosingPeriodStatus,
  deriveMonthlyClosingReadinessStatus,
  deriveMonthlyClosingReconciliationStatus,
  deriveMonthlyNetWorthChange,
} from '@/app/lib/monthly-closing/monthly-closing-domain';
import { prisma } from '@/app/lib/prisma';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  MonthlyClosingCardStatement,
  MonthlyClosingData,
  MonthlyClosingPendingTransactions,
  MonthlyClosingReadiness,
  MonthlyClosingReconciliationAccount,
} from '@/app/types/monthly-closing';

function periodEnd(period: { year: number; month: number }): LogicalDate {
  return {
    year: period.year,
    month: period.month,
    day: getLastDayOfMonth(period.year, period.month),
  };
}

function throughDateFilter(date: LogicalDate) {
  return [
    { year: { lt: date.year } },
    { year: date.year, month: { lt: date.month } },
    {
      year: date.year,
      month: date.month,
      day: { lte: date.day },
    },
  ];
}

async function getPendingTransactionsForUser(
  userId: string,
  period: { year: number; month: number },
  currency: SupportedCurrency,
): Promise<MonthlyClosingPendingTransactions> {
  const rows = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      userId,
      year: period.year,
      month: period.month,
      kind: 'NORMAL',
      status: 'PENDING',
      account: { is: { userId, currency } },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const byType = new Map(rows.map((row) => [row.type, row]));
  const income = byType.get('INCOME');
  const expense = byType.get('EXPENSE');

  return {
    checked: true,
    totalCount: (income?._count._all ?? 0) + (expense?._count._all ?? 0),
    income: {
      count: income?._count._all ?? 0,
      amount: income?._sum.amount ?? 0,
    },
    expense: {
      count: expense?._count._all ?? 0,
      amount: expense?._sum.amount ?? 0,
    },
  };
}

async function getReconciliationReadinessForUser(
  userId: string,
  end: LogicalDate,
  currency: SupportedCurrency,
) {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      currency,
      type: { in: ['CREDIT_DEBIT', 'INVESTMENT'] },
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: [
      { isActive: 'desc' },
      { name: 'asc' },
      { id: 'asc' },
    ],
  });

  const accountIds = accounts.map((account) => account.id);
  if (accountIds.length === 0) {
    return {
      checked: true as const,
      accountCount: 0,
      reconciledCount: 0,
      issueCount: 0,
      accounts: [] as MonthlyClosingReconciliationAccount[],
    };
  }

  const [
    completedGroups,
    unresolvedGroups,
    latestReconciledRows,
    confirmationEvents,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['accountId'],
      where: {
        userId,
        accountId: { in: accountIds },
        status: 'COMPLETED',
        OR: throughDateFilter(end),
      },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ['accountId'],
      where: {
        userId,
        accountId: { in: accountIds },
        status: 'COMPLETED',
        reconciliationStatus: { not: 'RECONCILED' },
        OR: throughDateFilter(end),
      },
      _count: { _all: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
        status: 'COMPLETED',
        reconciliationStatus: 'RECONCILED',
        reconciledAt: { not: null },
      },
      select: {
        accountId: true,
        reconciledAt: true,
      },
      orderBy: [
        { accountId: 'asc' },
        { reconciledAt: 'desc' },
      ],
      distinct: ['accountId'],
    }),
    prisma.accountReconciliationEvent.findMany({
      where: {
        userId,
        accountId: { in: accountIds },
        action: 'CONFIRMED',
      },
      select: {
        accountId: true,
        batchReconciledAt: true,
        cutoffYear: true,
        cutoffMonth: true,
        cutoffDay: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const completedByAccount = new Map(
    completedGroups.map((row) => [row.accountId, row._count._all]),
  );
  const unresolvedByAccount = new Map(
    unresolvedGroups.map((row) => [row.accountId, row._count._all]),
  );
  const activeBatchByAccount = new Map(
    latestReconciledRows.flatMap((row) =>
      row.reconciledAt
        ? [[row.accountId, row.reconciledAt] as const]
        : [],
    ),
  );

  const eventByBatch = new Map(
    confirmationEvents.map((event) => [
      event.accountId + ':' + event.batchReconciledAt.toISOString(),
      event,
    ]),
  );

  const items = accounts.flatMap((account) => {
    const completedCount = completedByAccount.get(account.id) ?? 0;
    if (completedCount === 0) return [];

    const batch = activeBatchByAccount.get(account.id) ?? null;
    const event = batch
      ? eventByBatch.get(account.id + ':' + batch.toISOString()) ?? null
      : null;
    const latestCutoff =
      event?.cutoffYear && event.cutoffMonth && event.cutoffDay
        ? {
            year: event.cutoffYear,
            month: event.cutoffMonth,
            day: event.cutoffDay,
          }
        : null;
    const unreconciledCount = unresolvedByAccount.get(account.id) ?? 0;

    return [{
      accountId: account.id,
      accountName: account.name,
      accountType: account.type as 'CREDIT_DEBIT' | 'INVESTMENT',
      status: deriveMonthlyClosingReconciliationStatus({
        hasReconciliation: Boolean(batch),
        latestCutoff,
        periodEnd: end,
        unreconciledCount,
      }),
      completedCount,
      unreconciledCount,
      latestCutoff,
      href: '/contas/show/' + encodeURIComponent(account.id),
    } satisfies MonthlyClosingReconciliationAccount];
  });

  const reconciledCount = items.filter(
    (item) => item.status === 'RECONCILED',
  ).length;

  return {
    checked: true as const,
    accountCount: items.length,
    reconciledCount,
    issueCount: items.length - reconciledCount,
    accounts: items,
  };
}

async function getCardStatementsForUser(
  userId: string,
  period: { year: number; month: number },
  currency: SupportedCurrency,
  asOf: LogicalDate,
) {
  const cards = await prisma.account.findMany({
    where: {
      userId,
      currency,
      type: 'CREDIT_CARD',
      statementClosingDay: { not: null },
      statementDueDay: { not: null },
    },
    select: {
      id: true,
      name: true,
      statementClosingDay: true,
      statementDueDay: true,
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
  });

  const cardIds = cards.map((card) => card.id);
  if (cardIds.length === 0) {
    return {
      checked: true as const,
      count: 0,
      paidCount: 0,
      openCount: 0,
      overdueCount: 0,
      items: [] as MonthlyClosingCardStatement[],
    };
  }

  const previous = shiftDashboardPeriod(period, -1);
  const [transactions, payments] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        accountId: { in: cardIds },
        kind: 'NORMAL',
        status: { not: 'CANCELLED' },
        OR: [previous, period],
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
        { year: 'asc' },
        { month: 'asc' },
        { day: 'asc' },
        { id: 'asc' },
      ],
    }),
    prisma.creditCardPayment.findMany({
      where: {
        userId,
        cardAccountId: { in: cardIds },
        closingYear: period.year,
        closingMonth: period.month,
      },
      select: {
        cardAccountId: true,
        closingYear: true,
        closingMonth: true,
        closingDay: true,
      },
    }),
  ]);

  const transactionsByCard = new Map<string, typeof transactions>();
  for (const transaction of transactions) {
    const list = transactionsByCard.get(transaction.accountId) ?? [];
    list.push(transaction);
    transactionsByCard.set(transaction.accountId, list);
  }

  const paid = new Set(
    payments.map(
      (payment) =>
        payment.cardAccountId +
        ':' +
        payment.closingYear +
        '-' +
        payment.closingMonth +
        '-' +
        payment.closingDay,
    ),
  );

  const end = periodEnd(period);
  const items = cards.flatMap((card) => {
    if (
      card.statementClosingDay === null ||
      card.statementDueDay === null
    ) {
      return [];
    }

    const statements = buildCreditCardStatements({
      asOf: end,
      statementClosingDay: card.statementClosingDay,
      statementDueDay: card.statementDueDay,
      transactions: transactionsByCard.get(card.id) ?? [],
      historyLimit: 2,
    });
    const statement = [
      ...statements.history,
      statements.current,
      ...statements.future,
    ].find(
      (item) =>
        item.closingDate.year === period.year &&
        item.closingDate.month === period.month,
    );

    if (!statement || statement.total <= 0) return [];

    const paymentKey =
      card.id +
      ':' +
      statement.closingDate.year +
      '-' +
      statement.closingDate.month +
      '-' +
      statement.closingDate.day;
    const state = paid.has(paymentKey)
      ? 'PAID'
      : compareLogicalDates(statement.dueDate, asOf) < 0
        ? 'OVERDUE'
        : 'OPEN';

    return [{
      cardId: card.id,
      cardName: card.name,
      amount: statement.total,
      transactionCount: statement.transactionCount,
      closingDate: statement.closingDate,
      dueDate: statement.dueDate,
      state,
      href: '/contas/show/' + encodeURIComponent(card.id),
    } satisfies MonthlyClosingCardStatement];
  });

  return {
    checked: true as const,
    count: items.length,
    paidCount: items.filter((item) => item.state === 'PAID').length,
    openCount: items.filter((item) => item.state === 'OPEN').length,
    overdueCount: items.filter((item) => item.state === 'OVERDUE').length,
    items,
  };
}

async function getMonthlyClosingReadinessForUser(
  userId: string,
  period: { year: number; month: number },
  currency: SupportedCurrency,
  asOf: LogicalDate,
): Promise<MonthlyClosingReadiness> {
  const end = periodEnd(period);
  const [
    pendingTransactions,
    reconciliation,
    cardStatements,
  ] = await Promise.all([
    getPendingTransactionsForUser(userId, period, currency),
    getReconciliationReadinessForUser(userId, end, currency),
    getCardStatementsForUser(userId, period, currency, asOf),
  ]);

  return {
    checked: true,
    status: deriveMonthlyClosingReadinessStatus({
      pendingTransactionCount: pendingTransactions.totalCount,
      reconciliationIssueCount: reconciliation.issueCount,
      openCardStatementCount: cardStatements.openCount,
      overdueCardStatementCount: cardStatements.overdueCount,
    }),
    pendingTransactions,
    reconciliation,
    cardStatements,
  };
}

export async function getMonthlyClosingForUser(
  userId: string,
  period: { year: number; month: number },
  currency: SupportedCurrency,
  now: Date = new Date(),
): Promise<MonthlyClosingData> {
  const asOf = logicalDateFromUtcInstant(now);
  const status = deriveMonthlyClosingPeriodStatus(period, asOf);

  if (status === 'FUTURE') {
    return {
      period,
      currency,
      asOf,
      status,
      retrospective: null,
    };
  }

  const [dashboard, netWorth, readiness] = await Promise.all([
    getMonthlyDashboardForUser(userId, period, currency, now),
    getNetWorthForUser(userId, {
      year: period.year,
      month: period.month,
      months: 2,
      referenceNow: now,
      includeCurrentValuation: false,
    }),
    getMonthlyClosingReadinessForUser(userId, period, currency, asOf),
  ]);

  return {
    period,
    currency,
    asOf,
    status,
    retrospective: {
      summary: dashboard.summary,
      comparison: dashboard.comparison,
      planning: dashboard.planning,
      topCategories: dashboard.categories.slice(0, 5).map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        realized: category.realized,
        sharePercentage: category.sharePercentage,
      })),
      netWorth: deriveMonthlyNetWorthChange(netWorth.history, currency),
      netWorthMethodology: netWorth.historyValuation,
      readiness,
    },
  };
}

export async function getMonthlyClosing(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { currency, ...period } = parseQuery(request, dashboardPeriodSchema, {
      year: null,
      month: null,
      currency: undefined,
    });
    return success(await getMonthlyClosingForUser(userId, period, currency));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao carregar fechamento mensal',
      zodMessage: 'Período inválido',
    });
  }
}
