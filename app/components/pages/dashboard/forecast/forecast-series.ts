import type { ForecastData, ForecastLogicalDate } from '@/app/types/forecast';

export type BalanceSeriesPoint = {
  date: ForecastLogicalDate;
  /** Soma dos saldos projetados de todas as contas logo após os lançamentos do dia. */
  balance: number;
  /** Variação do dia (entradas menos saídas, incluindo transferências). */
  delta: number;
};

export type BalanceSeries = {
  asOf: ForecastLogicalDate;
  horizonEnd: ForecastLogicalDate;
  startBalance: number;
  endBalance: number;
  /** Pontos com movimento, em ordem cronológica. O saldo inicial não é um ponto. */
  points: BalanceSeriesPoint[];
  lowest: { balance: number; date: ForecastLogicalDate };
};

function dateKey(date: ForecastLogicalDate) {
  return date.year * 10_000 + date.month * 100 + date.day;
}

/** Soma as linhas do tempo das contas numa única curva de saldo, a partir do saldo realizado. */
export function buildBalanceSeries(data: ForecastData): BalanceSeries {
  const startBalance = data.accounts.reduce((sum, account) => sum + account.realizedBalance, 0);
  const deltas = new Map<number, { date: ForecastLogicalDate; delta: number }>();

  for (const account of data.accounts) {
    for (const point of account.timeline) {
      const key = dateKey(point.date);
      const entry = deltas.get(key) ?? { date: point.date, delta: 0 };
      entry.delta += point.delta;
      deltas.set(key, entry);
    }
  }

  let balance = startBalance;
  let lowest = { balance: startBalance, date: data.asOf };
  const points = [...deltas.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, entry]): BalanceSeriesPoint => {
      balance += entry.delta;
      if (balance < lowest.balance) lowest = { balance, date: entry.date };
      return { date: entry.date, balance, delta: entry.delta };
    });

  return {
    asOf: data.asOf,
    horizonEnd: data.horizonEnd,
    startBalance,
    endBalance: balance,
    points,
    lowest,
  };
}

export type TimelineEntry = {
  id: string;
  kind: 'ITEM' | 'CARD';
  date: ForecastLogicalDate;
  overdue: boolean;
  title: string;
  subtitle: string;
  /** Positivo entra, negativo sai. */
  amount: number;
};

/** Junta pendências, vencidas e faturas numa só lista cronológica (vencidas primeiro). */
export function buildTimelineEntries(
  data: ForecastData,
  accountNames: ReadonlyMap<string, string>,
): TimelineEntry[] {
  const items = [...data.overdue.map((item) => ({ item, overdue: true })), ...data.upcoming.map((item) => ({ item, overdue: false }))].map(
    ({ item, overdue }): TimelineEntry => ({
      id: item.id,
      kind: 'ITEM',
      date: { year: item.year, month: item.month, day: item.day },
      overdue,
      title: item.description,
      subtitle: `${accountNames.get(item.accountId) ?? 'Conta'}${item.kind === 'TRANSFER' ? ' · Transferência' : ''}`,
      amount: item.type === 'INCOME' ? item.amount : -item.amount,
    }),
  );

  const cards = [
    ...data.cardCommitments.overdue.map((commitment) => ({ commitment, overdue: true })),
    ...data.cardCommitments.upcoming.map((commitment) => ({ commitment, overdue: false })),
  ].map(
    ({ commitment, overdue }): TimelineEntry => ({
      id: `card-${commitment.cardId}-${dateKey(commitment.closingDate)}`,
      kind: 'CARD',
      date: commitment.dueDate,
      overdue,
      title: `Fatura ${commitment.cardName}`,
      subtitle: `${commitment.transactionCount} ${commitment.transactionCount === 1 ? 'lançamento' : 'lançamentos'}`,
      amount: -commitment.amount,
    }),
  );

  return [...items, ...cards].sort(
    (left, right) =>
      Number(right.overdue) - Number(left.overdue) ||
      dateKey(left.date) - dateKey(right.date) ||
      left.id.localeCompare(right.id),
  );
}
