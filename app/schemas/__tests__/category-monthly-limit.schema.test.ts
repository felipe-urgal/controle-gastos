import { describe, expect, it } from 'vitest';

import {
  categoryMonthlyLimitPeriodSchema,
  removeCategoryMonthlyLimitSchema,
  upsertCategoryMonthlyLimitSchema,
} from '@/app/schemas/category-monthly-limit.schema';

const categoryId = '7b6b7c4b-2d60-4a31-a4e0-7ef770351457';

describe('category monthly limit schemas', () => {
  it('defaults legacy requests without currency to BRL', () => {
    expect(
      categoryMonthlyLimitPeriodSchema.parse({ year: '2028', month: '4' }),
    ).toEqual({ year: 2028, month: 4, currency: 'BRL' });

    expect(
      upsertCategoryMonthlyLimitSchema.parse({
        categoryId,
        year: 2028,
        month: 4,
        amount: 10_000,
      }),
    ).toMatchObject({ currency: 'BRL' });

    expect(
      removeCategoryMonthlyLimitSchema.parse({ categoryId, year: 2028, month: 4 }),
    ).toMatchObject({ currency: 'BRL' });
  });

  it('rejects unsupported currencies', () => {
    expect(() =>
      categoryMonthlyLimitPeriodSchema.parse({
        year: 2028,
        month: 4,
        currency: 'XYZ',
      }),
    ).toThrow();
  });
});
