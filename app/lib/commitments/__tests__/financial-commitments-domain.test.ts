import { describe, expect, it } from 'vitest';

import {
  isFinancialCommitmentInRange,
  sortFinancialCommitments,
  summarizeFinancialCommitments,
} from '@/app/lib/commitments/financial-commitments-domain';
import type { FinancialCommitment } from '@/app/types/financial-commitment';

const base: FinancialCommitment = {
  id: 'a',
  type: 'PENDING',
  direction: 'PAYABLE',
  state: 'UPCOMING',
  title: 'Conta',
  amount: 1000,
  currency: 'BRL',
  date: { year: 2026, month: 10, day: 2 },
  href: '/transacoes',
  accountName: 'Conta',
  source: { kind: 'TRANSACTION', id: 'a' },
};

describe('financial commitments domain', () => {
  it('sorts by date and puts milestones after monetary items on the same day', () => {
    const items = sortFinancialCommitments([
      {
        ...base,
        id: 'goal',
        title: 'Meta',
        amount: null,
        type: 'GOAL_DEADLINE',
        direction: 'MILESTONE',
        source: { kind: 'GOAL', id: 'goal' },
      },
      { ...base, id: 'next', title: 'B', date: { year: 2026, month: 10, day: 3 } },
      { ...base, id: 'money', title: 'A' },
    ]);
    expect(items.map((item) => item.id)).toEqual(['money', 'goal', 'next']);
  });

  it('includes both range boundaries', () => {
    const from = { year: 2026, month: 10, day: 1 };
    const through = { year: 2026, month: 10, day: 7 };
    expect(isFinancialCommitmentInRange(from, from, through)).toBe(true);
    expect(isFinancialCommitmentInRange(through, from, through)).toBe(true);
    expect(isFinancialCommitmentInRange({ year: 2026, month: 10, day: 8 }, from, through)).toBe(false);
  });

  it('never nets future income against payable commitments', () => {
    expect(summarizeFinancialCommitments([
      base,
      {
        ...base,
        id: 'income',
        direction: 'RECEIVABLE',
        amount: 2500,
      },
      {
        ...base,
        id: 'overdue',
        state: 'OVERDUE',
        amount: 500,
      },
      {
        ...base,
        id: 'goal',
        amount: null,
        type: 'GOAL_DEADLINE',
        direction: 'MILESTONE',
        source: { kind: 'GOAL', id: 'goal' },
      },
    ])).toEqual({
      payable: { count: 2, amount: 1500 },
      receivable: { count: 1, amount: 2500 },
      milestoneCount: 1,
      overdueCount: 1,
    });
  });
});
