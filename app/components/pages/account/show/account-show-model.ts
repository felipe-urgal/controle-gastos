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

export type SparklineShape = { line: string; area: string; endX: number; endY: number; points: Array<{ x: number; y: number }> };

/** Curva do saldo em coordenadas de uma caixa `width` x `height`; null com menos de dois pontos. */
export function buildSparkline(series: readonly number[], width: number, height: number, padding = 4): SparklineShape | null {
  if (series.length < 2) return null;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;
  const x = (index: number) => padding + (index / (series.length - 1)) * (width - padding * 2);
  // Série constante: uma linha reta no meio, em vez de dividir por zero.
  const y = (value: number) =>
    span === 0 ? height / 2 : padding + (1 - (value - min) / span) * (height - padding * 2);

  const line = series.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(' ');
  const lastIndex = series.length - 1;
  return {
    line,
    area: `${line} L ${x(lastIndex).toFixed(1)} ${height} L ${x(0).toFixed(1)} ${height} Z`,
    endX: x(lastIndex),
    endY: y(series[lastIndex]),
    points: series.map((value, index) => ({ x: x(index), y: y(value) })),
  };
}

export type AccountShowAction = { key: string; label: string; href: string; primary?: boolean };

/** Ações logo abaixo do saldo; a primeira é a mais provável para o tipo de conta. O extrato fica em "Ver extrato completo", junto da lista. */
export function accountShowActions(account: Pick<AccountModel, 'id' | 'type'>): AccountShowAction[] {
  if (account.type === 'INVESTMENT') {
    return [
      { key: 'operation', label: 'Nova operação', href: '/investimentos', primary: true },
      { key: 'positions', label: 'Ver posições', href: '/investimentos' },
    ];
  }

  return [
    { key: 'new', label: 'Lançar', href: '/transacoes/nova', primary: true },
    { key: 'transfer', label: 'Transferir', href: '/transacoes/nova?mode=transfer' },
    { key: 'reconcile', label: 'Reconciliar', href: '#account-reconciliation' },
  ];
}

const valueSourceLabels = { MARKET: 'mercado', COST: 'custo', MIXED: 'misto' } as const;

export function investmentValueSourceLabel(source: AccountModel['investmentValueSource']) {
  return source ? valueSourceLabels[source] : 'custo';
}
