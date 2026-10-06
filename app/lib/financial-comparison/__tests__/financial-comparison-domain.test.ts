import { describe, expect, it } from 'vitest';
import {
  enumerateComparisonMonths,
  financialComparisonMetric,
  isComparisonRangeInFuture,
  parseComparisonMonth,
} from '@/app/lib/financial-comparison/financial-comparison-domain';

describe('financial comparison domain', () => {
  it('enumerates inclusive month ranges across years', () => {
    expect(enumerateComparisonMonths({
      from: { year: 2027, month: 11 },
      to: { year: 2028, month: 2 },
    })).toEqual([
      { year: 2027, month: 11 },
      { year: 2027, month: 12 },
      { year: 2028, month: 1 },
      { year: 2028, month: 2 },
    ]);
  });

  it('rejects reversed and oversized ranges', () => {
    expect(() => enumerateComparisonMonths({
      from: { year: 2028, month: 5 },
      to: { year: 2028, month: 4 },
    })).toThrow('O fim do período');

    expect(() => enumerateComparisonMonths({
      from: { year: 2026, month: 1 },
      to: { year: 2028, month: 1 },
    })).toThrow('no máximo 24 meses');
  });

  it('identifies ranges that extend beyond the current logical month', () => {
    const currentMonth = { year: 2028, month: 5 };

    expect(isComparisonRangeInFuture({
      from: { year: 2028, month: 1 },
      to: { year: 2028, month: 5 },
    }, currentMonth)).toBe(false);

    expect(isComparisonRangeInFuture({
      from: { year: 2028, month: 5 },
      to: { year: 2028, month: 6 },
    }, currentMonth)).toBe(true);
  });

  it('does not invent a percentage when the baseline is zero', () => {
    expect(financialComparisonMetric(10_000, 0)).toEqual({ difference: 10_000, percentage: null });
  });

  it('parses only valid logical months', () => {
    expect(parseComparisonMonth('2028-09')).toEqual({ year: 2028, month: 9 });
    expect(parseComparisonMonth('2028-13')).toBeNull();
  });
});
