import { describe, expect, it } from 'vitest';

import {
  firstFutureRecurrence,
  recurringWindowStart,
} from '@/app/lib/recurrences/recurrence-scheduling';

describe('recurrence scheduling', () => {
  it('uses the injected UTC instant instead of the host local timezone', () => {
    expect(
      firstFutureRecurrence(
        { year: 2027, month: 12, day: 31 },
        'MONTHLY',
        1,
        new Date('2028-01-01T00:30:00+14:00'),
      ),
    ).toEqual({ year: 2027, month: 12, day: 31 });
  });

  it('preserves leap-day recurrence semantics across year boundaries', () => {
    expect(
      firstFutureRecurrence(
        { year: 2024, month: 2, day: 29 },
        'YEARLY',
        1,
        new Date('2025-02-28T23:59:59.000Z'),
      ),
    ).toEqual({ year: 2025, month: 2, day: 28 });
  });

  it('builds the recurring-history window from the same UTC clock', () => {
    expect(
      recurringWindowStart(36, new Date('2028-01-01T00:30:00+14:00')),
    ).toEqual({ year: 2025, month: 1 });
  });
});
