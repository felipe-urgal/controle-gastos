import { describe, expect, it } from 'vitest';

import { deriveMonthlyNetWorthChange } from '@/app/lib/monthly-closing/monthly-closing-domain';

describe('monthly closing domain', () => {
  it('calculates the change only when both monthly points exist', () => {
    expect(deriveMonthlyNetWorthChange([
      { year: 2028, month: 3, totals: { BRL: 100_000 } },
      { year: 2028, month: 4, totals: { BRL: 125_000 } },
    ], 'BRL')).toEqual({ previous: 100_000, current: 125_000, difference: 25_000 });

    expect(deriveMonthlyNetWorthChange([
      { year: 2028, month: 3, totals: { USD: 100_000 } },
      { year: 2028, month: 4, totals: { USD: 125_000 } },
    ], 'BRL')).toBeNull();
  });

  it('does not invent a previous point when history is insufficient', () => {
    expect(deriveMonthlyNetWorthChange([
      { year: 2028, month: 4, totals: { BRL: 125_000 } },
    ], 'BRL')).toBeNull();
  });
});
