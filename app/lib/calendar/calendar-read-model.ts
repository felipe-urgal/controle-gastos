import type { AccountType } from '@/app/types/account';
import type {
  CalendarCommitmentState,
  CalendarEvent,
  CalendarEventAccount,
  CalendarEventDirection,
  CalendarReadModel,
} from '@/app/types/calendar';
import {
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/app/types/financial-summary';
import type { FinancialCommitment } from '@/app/types/financial-commitment';
import type { TransactionSeriesType } from '@/app/types/transaction';

import { calculateCompletedTransactionTotals } from '@/app/lib/calendar/completed-totals';
import { getFinancialCommitmentsForUser } from '@/app/lib/commitments/financial-commitments';
import {
  compareLogicalDates,
  getLastDayOfMonth,
  logicalDateFromUtcInstant,
  type LogicalDate,
} from '@/app/lib/date/logical-date';
import { HttpError } from '@/app/lib/http-error';
import { prisma } from '@/app/lib/prisma';
import type { CalendarQueryInput } from '@/app/lib/calendar/calendar-schema';

const accountSelect = {
  id: true,
  name: true,
  type: true,
  currency: true,
} as const;

const transactionSelect = {
  id: true,
  transferId: true,
  transferRole: true,
  amount: true,
  type: true,
  kind: true,
  description: true,
  status: true,
  year: true,
  month: true,
  day: true,
  account: {
    select: accountSelect,
  },
  category: {
    select: {
      id: true,
      name: true,
      icon: true,
    },
  },
  series: {
    select: {
      type: true,
    },
  },
  transfer: {
    select: {
      transactions: {
        select: {
          id: true,
          transferRole: true,
          account: {
            select: accountSelect,
          },
        },
      },
    },
  },
} as const;

type CalendarTransactionRow = Awaited<
  ReturnType<typeof loadCalendarTransactions>
>[number];

type CalendarAccountRow = {
  id: string;
  name: string;
  type: string;
  currency: string;
};

function dateOf(row: Pick<CalendarTransactionRow, 'year' | 'month' | 'day'>): LogicalDate {
  return {
    year: row.year,
    month: row.month,
    day: row.day,
  };
}

function dateKey(date: LogicalDate) {
  return date.year * 10_000 + date.month * 100 + date.day;
}

function isSamePeriod(date: LogicalDate, period: CalendarQueryInput) {
  return date.year === period.year && date.month === period.month;
}

function commitmentState(
  date: LogicalDate,
  asOf: LogicalDate,
): CalendarCommitmentState {
  return compareLogicalDates(date, asOf) < 0 ? 'OVERDUE' : 'UPCOMING';
}

function toCalendarAccount(account: CalendarAccountRow): CalendarEventAccount {
  if (!isSupportedCurrency(account.currency)) {
    throw new Error('Moeda inválida no calendário');
  }

  return {
    id: account.id,
    name: account.name,
    type: account.type as AccountType,
    currency: account.currency,
  };
}

function counterpartForTransaction(row: CalendarTransactionRow) {
  const counterpart = row.transfer?.transactions.find(
    (item) => item.id !== row.id,
  );
  return counterpart ? toCalendarAccount(counterpart.account) : null;
}

function eventDirectionForTransaction(
  row: CalendarTransactionRow,
): CalendarEventDirection {
  if (row.kind !== 'NORMAL') return 'TRANSFER';
  return row.type;
}

function sourceKindForTransaction(row: CalendarTransactionRow) {
  if (row.kind === 'TRANSFER') return 'TRANSFER' as const;
  if (row.kind === 'CARD_PAYMENT') return 'CARD_PAYMENT' as const;
  return 'TRANSACTION' as const;
}

function transactionEvent(
  row: CalendarTransactionRow,
  asOf: LogicalDate,
  id = `transaction:${row.id}`,
): CalendarEvent {
  const account = toCalendarAccount(row.account);
  const isPendingCommitment =
    row.kind === 'NORMAL' &&
    row.status === 'PENDING' &&
    account.type !== 'CREDIT_CARD';

  return {
    id,
    sourceId: row.kind === 'TRANSFER' ? row.transferId ?? row.id : row.id,
    sourceKind: sourceKindForTransaction(row),
    title: row.description,
    amount: row.amount,
    currency: account.currency,
    date: dateOf(row),
    direction: eventDirectionForTransaction(row),
    status: row.status,
    commitmentState: isPendingCommitment
      ? commitmentState(dateOf(row), asOf)
      : null,
    account,
    counterpartAccount: counterpartForTransaction(row),
    category: row.category
      ? {
          id: row.category.id,
          name: row.category.name,
          icon: row.category.icon,
        }
      : null,
    transferRole: row.kind === 'TRANSFER' ? row.transferRole : null,
    seriesType: (row.series?.type ?? null) as TransactionSeriesType | null,
    href: `/transacoes/show/${row.id}`,
  };
}

function consolidatedTransferEvent(
  rows: readonly CalendarTransactionRow[],
  asOf: LogicalDate,
): CalendarEvent {
  const source =
    rows.find((row) => row.transferRole === 'SOURCE') ?? rows[0];

  if (!source) {
    throw new Error('Transferência vazia no calendário');
  }

  return {
    ...transactionEvent(
      source,
      asOf,
      `transfer:${source.transferId ?? source.id}`,
    ),
    transferRole: null,
  };
}

function buildTransactionEvents(
  rows: readonly CalendarTransactionRow[],
  asOf: LogicalDate,
  accountId: string | undefined,
) {
  const direct = rows
    .filter((row) => row.kind !== 'TRANSFER')
    .map((row) => transactionEvent(row, asOf));

  const transferRows = rows.filter((row) => row.kind === 'TRANSFER');
  if (accountId) {
    return [
      ...direct,
      ...transferRows.map((row) =>
        transactionEvent(
          row,
          asOf,
          `transfer:${row.transferId ?? row.id}:${row.account.id}`,
        ),
      ),
    ];
  }

  const transferGroups = new Map<string, CalendarTransactionRow[]>();
  for (const row of transferRows) {
    const key = row.transferId ?? row.id;
    const group = transferGroups.get(key) ?? [];
    group.push(row);
    transferGroups.set(key, group);
  }

  return [
    ...direct,
    ...[...transferGroups.values()].map((group) =>
      consolidatedTransferEvent(group, asOf),
    ),
  ];
}

function commitmentMatchesAccount(
  item: FinancialCommitment,
  accountId: string | undefined,
  visibleTransactionIds: ReadonlySet<string>,
) {
  if (!accountId) return true;
  if (item.source.kind === 'TRANSACTION') {
    return visibleTransactionIds.has(item.source.id);
  }
  if (item.source.kind === 'CARD') {
    return item.source.id === accountId;
  }
  return false;
}

function derivedCommitmentEvent(
  item: FinancialCommitment,
  accountById: ReadonlyMap<string, CalendarAccountRow>,
  asOf: LogicalDate,
): CalendarEvent | null {
  if (item.source.kind === 'TRANSACTION') return null;

  const account =
    item.source.kind === 'CARD'
      ? accountById.get(item.source.id)
      : undefined;
  const sourceKind =
    item.source.kind === 'CARD'
      ? 'CARD_STATEMENT'
      : item.source.kind === 'DEBT'
        ? 'DEBT_INSTALLMENT'
        : 'GOAL_DEADLINE';

  return {
    id: `commitment:${item.id}`,
    sourceId: item.source.id,
    sourceKind,
    title: item.title,
    amount: item.amount,
    currency: item.currency,
    date: item.date,
    direction:
      item.direction === 'MILESTONE'
        ? 'MILESTONE'
        : item.direction === 'RECEIVABLE'
          ? 'INCOME'
          : 'EXPENSE',
    status: null,
    commitmentState: commitmentState(item.date, asOf),
    account: account ? toCalendarAccount(account) : null,
    counterpartAccount: null,
    category: null,
    transferRole: null,
    seriesType: null,
    href: item.href,
  };
}

function compareEvents(left: CalendarEvent, right: CalendarEvent) {
  const byDate = dateKey(left.date) - dateKey(right.date);
  if (byDate !== 0) return byDate;

  if (left.amount === null && right.amount !== null) return 1;
  if (left.amount !== null && right.amount === null) return -1;

  return left.title.localeCompare(right.title, 'pt-BR');
}

async function loadCalendarTransactions(
  userId: string,
  input: CalendarQueryInput,
) {
  return prisma.transaction.findMany({
    where: {
      userId,
      year: input.year,
      month: input.month,
      ...(input.accountId ? { accountId: input.accountId } : {}),
      account: {
        is: {
          userId,
        },
      },
    },
    select: transactionSelect,
    orderBy: [
      { day: 'asc' },
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
  });
}

async function loadPeriodCommitments(
  userId: string,
  input: CalendarQueryInput,
  currencies: readonly SupportedCurrency[],
) {
  const periodReference = new Date(
    Date.UTC(input.year, input.month - 1, 1, 12),
  );

  const data = await Promise.all(
    currencies.map((currency) =>
      getFinancialCommitmentsForUser(
        userId,
        { currency, days: 90 },
        periodReference,
      ),
    ),
  );

  return data
    .flatMap((result) => result.items)
    .filter((item) => isSamePeriod(item.date, input));
}

function rowsForDay(
  rows: readonly CalendarTransactionRow[],
  day: number,
) {
  return rows.filter((row) => row.day === day);
}

function totalsInput(rows: readonly CalendarTransactionRow[]) {
  return rows.map((row) => ({
    amount: row.amount,
    type: row.type,
    kind: row.kind,
    status: row.status,
    account: {
      currency: row.account.currency,
      type: row.account.type as AccountType,
    },
  }));
}

export async function getCalendarForUser(
  userId: string,
  input: CalendarQueryInput,
  now: Date = new Date(),
): Promise<CalendarReadModel> {
  const asOf = logicalDateFromUtcInstant(now);
  const ownedAccounts = await prisma.account.findMany({
    where: { userId },
    select: accountSelect,
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
  const accountById = new Map(
    ownedAccounts.map((account) => [account.id, account]),
  );

  if (input.accountId && !accountById.has(input.accountId)) {
    throw new HttpError('Conta não encontrada', 404, 'ACCOUNT_NOT_FOUND');
  }

  const selectedAccount = input.accountId
    ? accountById.get(input.accountId)
    : undefined;
  if (
    selectedAccount &&
    !isSupportedCurrency(selectedAccount.currency)
  ) {
    throw new HttpError('Moeda da conta não suportada', 400, 'INVALID_CURRENCY');
  }

  const commitmentCurrencies: readonly SupportedCurrency[] = selectedAccount
    ? [selectedAccount.currency as SupportedCurrency]
    : SUPPORTED_CURRENCIES;

  const [rows, commitmentItems] = await Promise.all([
    loadCalendarTransactions(userId, input),
    loadPeriodCommitments(userId, input, commitmentCurrencies),
  ]);

  const transactionEvents = buildTransactionEvents(
    rows,
    asOf,
    input.accountId,
  );
  const visibleTransactionIds = new Set(rows.map((row) => row.id));

  const derivedCommitments = commitmentItems
    .filter((item) =>
      commitmentMatchesAccount(
        item,
        input.accountId,
        visibleTransactionIds,
      ),
    )
    .flatMap((item) => {
      const event = derivedCommitmentEvent(item, accountById, asOf);
      return event ? [event] : [];
    });

  const pendingTransactionCommitments = transactionEvents.filter(
    (event) =>
      event.sourceKind === 'TRANSACTION' &&
      event.status === 'PENDING' &&
      event.account?.type !== 'CREDIT_CARD',
  );

  const commitments = [
    ...pendingTransactionCommitments,
    ...derivedCommitments,
  ].sort(compareEvents);

  const events = [
    ...transactionEvents,
    ...derivedCommitments,
  ].sort(compareEvents);

  const eventsByDay = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    const list = eventsByDay.get(event.date.day) ?? [];
    list.push(event);
    eventsByDay.set(event.date.day, list);
  }

  const lastDay = getLastDayOfMonth(input.year, input.month);
  const days = Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    return {
      date: {
        year: input.year,
        month: input.month,
        day,
      },
      summaries: calculateCompletedTransactionTotals(
        totalsInput(rowsForDay(rows, day)),
      ),
      events: eventsByDay.get(day) ?? [],
    };
  });

  return {
    period: {
      year: input.year,
      month: input.month,
    },
    asOf,
    accountId: input.accountId ?? null,
    days,
    summary: calculateCompletedTransactionTotals(totalsInput(rows)),
    commitments,
    commitmentCount: commitments.length,
    overdueCount: commitments.filter(
      (item) => item.commitmentState === 'OVERDUE',
    ).length,
  };
}
