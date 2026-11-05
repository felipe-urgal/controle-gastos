import { describe, expect, it } from 'vitest';

import {
  contributionByClass,
  rebalancePlan,
  validateAllocationTargets,
} from '@/app/lib/investments/allocation-target-domain';

describe('validateAllocationTargets', () => {
  it('exige inteiros de 1 a 100, sem classe repetida e soma exata de 100% (ou lista vazia para limpar)', () => {
    expect(validateAllocationTargets([])).toBeNull();
    expect(validateAllocationTargets([{ assetType: 'STOCK', percent: 60 }, { assetType: 'FII', percent: 40 }])).toBeNull();
    expect(validateAllocationTargets([{ assetType: 'STOCK', percent: 60 }, { assetType: 'FII', percent: 30 }])).toMatch(/somam 90%/);
    expect(validateAllocationTargets([{ assetType: 'STOCK', percent: 0 }, { assetType: 'FII', percent: 100 }])).toMatch(/1 a 100/);
    expect(validateAllocationTargets([{ assetType: 'STOCK', percent: 50.5 }])).toMatch(/inteiro/);
    expect(validateAllocationTargets([{ assetType: 'STOCK', percent: 50 }, { assetType: 'STOCK', percent: 50 }])).toMatch(/uma vez/);
  });
});

describe('rebalancePlan', () => {
  const targets = [
    { assetType: 'STOCK' as const, percent: 60 },
    { assetType: 'FIXED_INCOME' as const, percent: 40 },
  ];

  it('mostra quanto falta ou sobra em cada classe e o aporte mínimo para equilibrar sem vender', () => {
    const plan = rebalancePlan({
      holdings: [
        { assetType: 'STOCK', value: 80_000 },
        { assetType: 'FIXED_INCOME', value: 20_000 },
      ],
      targets,
    });
    expect(plan.total).toBe(100_000);
    expect(plan.rows).toEqual([
      { assetType: 'STOCK', currentValue: 80_000, currentShare: 80, targetPercent: 60, targetValue: 60_000, difference: -20_000 },
      { assetType: 'FIXED_INCOME', currentValue: 20_000, currentShare: 20, targetPercent: 40, targetValue: 40_000, difference: 20_000 },
    ]);
    // Ações são 80k e devem ficar em 60%: o total precisa chegar a 133.334, ou seja, aportar 33.334 em renda fixa.
    expect(plan.contributionToBalance).toBe(33_334);
    expect(contributionByClass(plan)).toEqual([
      { assetType: 'FIXED_INCOME', amount: 33_334 },
    ]);
  });

  it('carteira já na meta não pede aporte', () => {
    const plan = rebalancePlan({
      holdings: [
        { assetType: 'STOCK', value: 60_000 },
        { assetType: 'FIXED_INCOME', value: 40_000 },
      ],
      targets,
    });
    expect(plan.contributionToBalance).toBe(0);
    expect(contributionByClass(plan)).toEqual([]);
  });

  it('valor em classe sem meta fica à parte e aportar não resolve; classe da meta sem posição entra com zero', () => {
    const plan = rebalancePlan({
      holdings: [
        { assetType: 'STOCK', value: 50_000 },
        { assetType: 'CRYPTO', value: 10_000 },
      ],
      targets,
    });
    expect(plan.untargetedValue).toBe(10_000);
    expect(plan.contributionToBalance).toBeNull();
    expect(contributionByClass(plan)).toEqual([]);
    expect(plan.rows.find((row) => row.assetType === 'FIXED_INCOME')).toMatchObject({ currentValue: 0, targetValue: 24_000, difference: 24_000 });
    expect(plan.rows.find((row) => row.assetType === 'CRYPTO')).toMatchObject({ targetPercent: 0, difference: -10_000 });
  });

  it('carteira vazia e sem meta não gera conta nem aporte', () => {
    expect(rebalancePlan({ holdings: [], targets: [] })).toMatchObject({ total: 0, rows: [], contributionToBalance: null });
    expect(rebalancePlan({ holdings: [], targets }).contributionToBalance).toBe(0);
  });
});
