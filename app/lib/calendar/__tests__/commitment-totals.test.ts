import { describe, expect, it } from 'vitest';

import { summarizeCommitments } from '@/app/lib/calendar/commitment-totals';
import type { CalendarEvent } from '@/app/types/calendar';

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 'e',
    sourceId: 's',
    sourceKind: 'TRANSACTION',
    title: 'Item',
    amount: 1_000,
    currency: 'BRL',
    date: { year: 2026, month: 10, day: 20 },
    direction: 'EXPENSE',
    status: 'PENDING',
    commitmentState: 'UPCOMING',
    account: null,
    counterpartAccount: null,
    category: null,
    transferRole: null,
    seriesType: null,
    href: '/transacoes',
    ...overrides,
  };
}

describe('summarizeCommitments', () => {
  it('separa a pagar, a receber e vencidos por moeda', () => {
    const totals = summarizeCommitments([
      event({ amount: 15_000, commitmentState: 'OVERDUE' }),
      event({ amount: 24_000 }),
      event({ amount: 120_000, direction: 'INCOME' }),
      event({ amount: 500, currency: 'USD' }),
    ]);

    expect(totals).toEqual([
      { currency: 'BRL', payable: 39_000, receivable: 120_000, overduePayable: 15_000, withoutAmount: 0 },
      { currency: 'USD', payable: 500, receivable: 0, overduePayable: 0, withoutAmount: 0 },
    ]);
  });

  it('não soma valor desconhecido como zero e ignora marcos e transferências', () => {
    const totals = summarizeCommitments([
      event({ amount: null }),
      event({ direction: 'MILESTONE', amount: null }),
      event({ direction: 'TRANSFER', amount: 9_999 }),
    ]);

    expect(totals).toEqual([
      { currency: 'BRL', payable: 0, receivable: 0, overduePayable: 0, withoutAmount: 1 },
    ]);
  });
});
