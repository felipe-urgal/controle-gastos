import type { AccountModel, AccountRecentTransaction } from '@/app/types/account';

export type MovementFilter = 'all' | 'in' | 'out' | 'pending';

type LogicalDay = { year: number; month: number; day: number };

function dayNumber(date: LogicalDay) {
  return Date.UTC(date.year, date.month - 1, date.day) / 86_400_000;
}

const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "Hoje", "Ontem", "Amanhã" ou "20 out" (com o ano quando não é o atual). */
export function movementDayLabel(date: LogicalDay, today: LogicalDay) {
  const distance = dayNumber(date) - dayNumber(today);
  if (distance === 0) return 'Hoje';
  if (distance === -1) return 'Ontem';
  if (distance === 1) return 'Amanhã';
  const label = `${date.day} ${monthNames[date.month - 1]}`;
  return date.year === today.year ? label : `${label} ${date.year}`;
}

function isPending(transaction: Pick<AccountRecentTransaction, 'status'>) {
  return transaction.status === 'PENDING';
}

/** Cancelada não é movimento da conta; as demais entram conforme o filtro. */
export function filterMovements(transactions: readonly AccountRecentTransaction[], filter: MovementFilter) {
  const visible = transactions.filter((transaction) => transaction.status !== 'CANCELLED');
  if (filter === 'pending') return visible.filter(isPending);

  const completed = visible.filter((transaction) => !isPending(transaction));
  if (filter === 'in') return completed.filter((transaction) => transaction.type === 'INCOME');
  if (filter === 'out') return completed.filter((transaction) => transaction.type === 'EXPENSE');
  return completed;
}

export type MovementGroup = { key: string; label: string; items: AccountRecentTransaction[] };

/** Agrupa por dia mantendo a ordem recebida (mais recente primeiro). */
export function groupMovementsByDay(transactions: readonly AccountRecentTransaction[], today: LogicalDay): MovementGroup[] {
  const groups: MovementGroup[] = [];
  for (const transaction of transactions) {
    const key = `${transaction.year}-${transaction.month}-${transaction.day}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(transaction);
    } else {
      groups.push({ key, label: movementDayLabel(transaction, today), items: [transaction] });
    }
  }
  return groups;
}

const valueSourceLabels = { MARKET: 'mercado', COST: 'custo', MIXED: 'misto' } as const;

export function investmentValueSourceLabel(source: AccountModel['investmentValueSource']) {
  return source ? valueSourceLabels[source] : 'custo';
}
