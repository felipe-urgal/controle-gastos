import { describe, expect, it } from 'vitest';

import { buildBalanceSeries, buildTimelineEntries } from '@/app/components/pages/dashboard/forecast/forecast-series';
import type { ForecastAccount, ForecastData } from '@/app/types/forecast';

function account(id: string, realizedBalance: number, timeline: Array<[number, number]>): ForecastAccount {
  let balance = realizedBalance;
  return {
    id,
    name: `Conta ${id}`,
    realizedBalance,
    pendingIncome: 0,
    pendingExpense: 0,
    projectedBalance: 0,
    lowestProjectedBalance: 0,
    lowestProjectedBalanceDate: { year: 2028, month: 4, day: 10 },
    timeline: timeline.map(([day, delta]) => {
      balance += delta;
      return { date: { year: 2028, month: 4, day }, income: Math.max(delta, 0), expense: Math.max(-delta, 0), delta, balance };
    }),
  };
}

function forecast(overrides: Partial<ForecastData> = {}): ForecastData {
  return {
    currency: 'BRL',
    asOf: { year: 2028, month: 4, day: 10 },
    horizonDays: 30,
    horizonEnd: { year: 2028, month: 5, day: 9 },
    accounts: [],
    overdue: [],
    upcoming: [],
    cardCommitments: { overdue: [], upcoming: [] },
    safeToSpend: { realizedBalance: 0, pendingExpenses: 0, cardCommitments: 0, transferNet: 0, safeToSpend: 0, accounts: [] },
    ...overrides,
  } as ForecastData;
}

describe('buildBalanceSeries', () => {
  it('soma as contas e acumula as variações por dia em ordem cronológica', () => {
    const series = buildBalanceSeries(
      forecast({ accounts: [account('a', 100_000, [[20, -30_000], [12, 10_000]]), account('b', 50_000, [[12, -5_000]])] }),
    );

    expect(series.startBalance).toBe(150_000);
    expect(series.points.map((point) => [point.date.day, point.delta, point.balance])).toEqual([
      [12, 5_000, 155_000],
      [20, -30_000, 125_000],
    ]);
    expect(series.endBalance).toBe(125_000);
  });

  it('informa o menor saldo e a data em que ele ocorre', () => {
    const series = buildBalanceSeries(forecast({ accounts: [account('a', 10_000, [[12, -25_000], [15, 30_000]])] }));

    expect(series.lowest).toEqual({ balance: -15_000, date: { year: 2028, month: 4, day: 12 } });
  });

  it('usa o saldo de hoje como menor saldo quando nada o reduz', () => {
    const series = buildBalanceSeries(forecast({ accounts: [account('a', 10_000, [[12, 5_000]])] }));

    expect(series.lowest).toEqual({ balance: 10_000, date: { year: 2028, month: 4, day: 10 } });
  });

  it('funciona sem contas nem lançamentos', () => {
    const series = buildBalanceSeries(forecast());

    expect(series).toMatchObject({ startBalance: 0, endBalance: 0, points: [] });
  });
});

describe('buildTimelineEntries', () => {
  it('coloca vencidos primeiro e ordena o restante por data, incluindo faturas', () => {
    const entries = buildTimelineEntries(
      forecast({
        overdue: [{ id: 'o1', accountId: 'a', amount: 5_000, type: 'EXPENSE', kind: 'NORMAL', status: 'PENDING', description: 'Vencida', year: 2028, month: 4, day: 5 }],
        upcoming: [
          { id: 'u2', accountId: 'a', amount: 1_000, type: 'EXPENSE', kind: 'NORMAL', status: 'PENDING', description: 'Depois', year: 2028, month: 4, day: 25 },
          { id: 'u1', accountId: 'a', amount: 8_000, type: 'INCOME', kind: 'NORMAL', status: 'PENDING', description: 'Salário', year: 2028, month: 4, day: 15 },
        ],
        cardCommitments: {
          overdue: [],
          upcoming: [{ cardId: 'c1', cardName: 'Nubank', amount: 120_000, closingDate: { year: 2028, month: 4, day: 5 }, dueDate: { year: 2028, month: 4, day: 20 }, transactionCount: 1 }],
        },
      }),
      new Map([['a', 'Conta A']]),
    );

    expect(entries.map((entry) => [entry.title, entry.overdue, entry.amount])).toEqual([
      ['Vencida', true, -5_000],
      ['Salário', false, 8_000],
      ['Fatura Nubank', false, -120_000],
      ['Depois', false, -1_000],
    ]);
    expect(entries[2]).toMatchObject({ kind: 'CARD', subtitle: '1 lançamento' });
  });
});
