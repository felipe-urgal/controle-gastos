import { describe, expect, it } from 'vitest';

import { projectIncomes } from '@/app/lib/investments/income-projection-domain';

const asOf = { year: 2026, month: 11 };
const open = new Set(['a', 'b']);

describe('projectIncomes', () => {
  it('usa o mesmo mês de um ano antes, começando no mês seguinte e atravessando a virada de ano', () => {
    const projection = projectIncomes({
      asOf,
      openAssetIds: open,
      incomes: [
        { assetId: 'a', year: 2025, month: 12, netAmountCents: 5_000 },
        { assetId: 'b', year: 2025, month: 12, netAmountCents: 2_500 },
        { assetId: 'a', year: 2026, month: 3, netAmountCents: 1_000 },
        { assetId: 'a', year: 2026, month: 1, netAmountCents: 900 },
      ],
    });
    expect(projection.months).toHaveLength(12);
    expect(projection.months[0]).toEqual({ year: 2026, month: 12, amountCents: 7_500, assetCount: 2 });
    expect(projection.months[1]).toMatchObject({ year: 2027, month: 1, amountCents: 900, assetCount: 1 });
    expect(projection.months[3]).toMatchObject({ year: 2027, month: 3, amountCents: 1_000 });
    expect(projection.months[11]).toMatchObject({ year: 2027, month: 11, amountCents: 0, assetCount: 0 });
    expect(projection.totalCents).toBe(9_400);
    expect(projection.referenceMonthsWithIncome).toBe(3);
  });

  it('ignora ativos que não estão mais em carteira e o que está fora da janela de referência', () => {
    const projection = projectIncomes({
      asOf,
      openAssetIds: new Set(['a']),
      incomes: [
        { assetId: 'sold', year: 2025, month: 12, netAmountCents: 99_999 },
        // Dois anos atrás não serve de referência para o próximo dezembro.
        { assetId: 'a', year: 2024, month: 12, netAmountCents: 88_888 },
        { assetId: 'a', year: 2025, month: 12, netAmountCents: 1_234 },
      ],
    });
    expect(projection.months[0].amountCents).toBe(1_234);
    expect(projection.totalCents).toBe(1_234);
  });

  it('sem proventos de referência devolve zeros, não valores inventados', () => {
    const projection = projectIncomes({ asOf, openAssetIds: open, incomes: [] });
    expect(projection.totalCents).toBe(0);
    expect(projection.referenceMonthsWithIncome).toBe(0);
    expect(projection.months.every((item) => item.amountCents === 0)).toBe(true);
  });
});
