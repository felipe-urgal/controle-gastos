import { describe, expect, it } from 'vitest';

import {
  applyForecastScenarios,
  type ForecastScenarioMovement,
} from '@/app/lib/forecast/forecast-scenario';
import type { ForecastData } from '@/app/types/forecast';

const base: ForecastData = {
  currency: 'BRL',
  asOf: { year: 2026, month: 9, day: 30 },
  horizonDays: 30,
  horizonEnd: { year: 2026, month: 10, day: 29 },
  accounts: [
    {
      id: 'checking',
      name: 'Conta',
      realizedBalance: 100_00,
      pendingIncome: 20_00,
      pendingExpense: 10_00,
      projectedBalance: 110_00,
      lowestProjectedBalance: 100_00,
      lowestProjectedBalanceDate: { year: 2026, month: 9, day: 30 },
      timeline: [
        {
          date: { year: 2026, month: 10, day: 5 },
          income: 20_00,
          expense: 10_00,
          delta: 10_00,
          balance: 110_00,
        },
      ],
    },
  ],
  overdue: [],
  upcoming: [],
  cardCommitments: { overdue: [], upcoming: [] },
};

function scenario(
  values: Partial<ForecastScenarioMovement> = {},
): ForecastScenarioMovement {
  return {
    id: 'scenario-1',
    accountId: 'checking',
    currency: 'BRL',
    amount: 25_00,
    type: 'EXPENSE',
    description: 'Viagem',
    year: 2026,
    month: 10,
    day: 10,
    ...values,
  };
}

describe('forecast scenario', () => {
  it('keeps the original forecast unchanged when the scenario is empty', () => {
    const result = applyForecastScenarios(base, []);

    expect(result.accounts).toEqual(base.accounts);
    expect(result.appliedMovements).toEqual([]);
    expect(result.outsideHorizon).toEqual([]);
  });

  it('applies income and expense scenarios without mutating the base forecast', () => {
    const result = applyForecastScenarios(base, [
      scenario(),
      scenario({
        id: 'scenario-2',
        amount: 40_00,
        type: 'INCOME',
        day: 15,
        description: 'Renda extra',
      }),
    ]);

    expect(result.accounts[0].projectedBalance).toBe(125_00);
    expect(result.accounts[0].pendingIncome).toBe(60_00);
    expect(result.accounts[0].pendingExpense).toBe(35_00);
    expect(base.accounts[0].projectedBalance).toBe(110_00);
  });

  it('rejects a scenario with a different currency', () => {
    expect(() =>
      applyForecastScenarios(base, [scenario({ currency: 'USD' })]),
    ).toThrow('moeda incompatível');
  });

  it('keeps movements beyond the selected horizon unapplied', () => {
    const result = applyForecastScenarios(base, [
      scenario({ month: 11, day: 1 }),
    ]);

    expect(result.accounts[0].projectedBalance).toBe(110_00);
    expect(result.appliedMovements).toEqual([]);
    expect(result.outsideHorizon).toHaveLength(1);
  });

  it.each([30, 60, 90] as const)(
    'respects the supplied %d-day horizon end',
    (horizonDays) => {
      const horizonEnd =
        horizonDays === 30
          ? { year: 2026, month: 10, day: 29 }
          : horizonDays === 60
            ? { year: 2026, month: 11, day: 28 }
            : { year: 2026, month: 12, day: 28 };
      const data = { ...base, horizonDays, horizonEnd };
      const result = applyForecastScenarios(data, [
        scenario({ month: 11, day: 1 }),
      ]);

      expect(result.appliedMovements).toHaveLength(horizonDays === 30 ? 0 : 1);
    },
  );
});
