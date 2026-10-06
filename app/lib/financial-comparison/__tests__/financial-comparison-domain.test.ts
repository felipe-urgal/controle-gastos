import { describe, expect, it } from 'vitest';

import {
  averageComparisonAmount,
  comparisonRangesOverlap,
  enumerateComparisonMonths,
  financialComparisonMetric,
  isComparisonMonthInRange,
  isComparisonRangeInFuture,
  parseComparisonMonth,
} from '@/app/lib/financial-comparison/financial-comparison-domain';

describe('financial comparison domain', () => {
  it('enumerates inclusive month ranges across years', () => {
    expect(
      enumerateComparisonMonths({
        from: { year: 2027, month: 11 },
        to: { year: 2028, month: 2 },
      }),
    ).toEqual([
      { year: 2027, month: 11 },
      { year: 2027, month: 12 },
      { year: 2028, month: 1 },
      { year: 2028, month: 2 },
    ]);
  });

  it('rejects reversed and oversized ranges', () => {
    expect(() =>
      enumerateComparisonMonths({
        from: { year: 2028, month: 5 },
        to: { year: 2028, month: 4 },
      }),
    ).toThrow('O fim do período');

    expect(() =>
      enumerateComparisonMonths({
        from: { year: 2026, month: 1 },
        to: { year: 2028, month: 1 },
      }),
    ).toThrow('no máximo 24 meses');
  });

  it('identifies ranges that extend beyond the current logical month', () => {
    const currentMonth = { year: 2028, month: 5 };

    expect(
      isComparisonRangeInFuture(
        {
          from: { year: 2028, month: 1 },
          to: { year: 2028, month: 5 },
        },
        currentMonth,
      ),
    ).toBe(false);

    expect(
      isComparisonRangeInFuture(
        {
          from: { year: 2028, month: 5 },
          to: { year: 2028, month: 6 },
        },
        currentMonth,
      ),
    ).toBe(true);
  });

  it('handles the December to January logical-month boundary', () => {
    const currentMonth = { year: 2029, month: 1 };

    expect(
      isComparisonRangeInFuture(
        {
          from: { year: 2028, month: 12 },
          to: { year: 2029, month: 1 },
        },
        currentMonth,
      ),
    ).toBe(false);

    expect(
      isComparisonRangeInFuture(
        {
          from: { year: 2029, month: 1 },
          to: { year: 2029, month: 2 },
        },
        currentMonth,
      ),
    ).toBe(true);
  });

  it('detects overlap and range membership across year boundaries', () => {
    const a = {
      from: { year: 2027, month: 11 },
      to: { year: 2028, month: 2 },
    };
    const b = {
      from: { year: 2028, month: 2 },
      to: { year: 2028, month: 5 },
    };
    const c = {
      from: { year: 2028, month: 6 },
      to: { year: 2028, month: 8 },
    };

    expect(comparisonRangesOverlap(a, b)).toBe(true);
    expect(comparisonRangesOverlap(a, c)).toBe(false);
    expect(isComparisonMonthInRange({ year: 2028, month: 1 }, a)).toBe(true);
    expect(isComparisonMonthInRange({ year: 2028, month: 3 }, a)).toBe(false);
  });

  it('normalizes totals by the exact coverage length', () => {
    expect(averageComparisonAmount(30_000, 3)).toBe(10_000);
    expect(averageComparisonAmount(120_000, 12)).toBe(10_000);
    expect(averageComparisonAmount(10_001, 3)).toBe(3_334);
  });

  it('does not invent a percentage when the baseline is zero', () => {
    expect(financialComparisonMetric(10_000, 0)).toEqual({
      difference: 10_000,
      percentage: null,
    });
  });

  it('parses only valid logical months', () => {
    expect(parseComparisonMonth('2028-09')).toEqual({
      year: 2028,
      month: 9,
    });
    expect(parseComparisonMonth('2028-13')).toBeNull();
  });
});
