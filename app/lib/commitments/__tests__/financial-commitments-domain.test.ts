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
  title: 'Conta',
  amount: 1000,
  currency: 'BRL',
  date: { year: 2026, month: 10, day: 2 },
  href: '/transacoes',
  accountName: 'Conta',
};

describe('financial commitments domain', () => {
  it('sorts by date and puts milestones after monetary items on the same day', () => {
    const items = sortFinancialCommitments([
      { ...base, id: 'goal', title: 'Meta', amount: null, type: 'GOAL_DEADLINE' },
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

  it('separates monetary commitments from milestones', () => {
    expect(summarizeFinancialCommitments([
      base,
      { ...base, id: 'goal', amount: null, type: 'GOAL_DEADLINE' },
    ])).toEqual({ monetaryCount: 1, monetaryAmount: 1000, milestoneCount: 1 });
  });
});
