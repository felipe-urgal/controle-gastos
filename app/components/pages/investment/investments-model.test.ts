import { describe, expect, it } from 'vitest';

import { portfolioCurrencies, summarizeCurrency } from '@/app/components/pages/investment/investments-model';
import type { InvestmentPosition } from '@/app/types/investment';

function position(overrides: Partial<InvestmentPosition> & Pick<InvestmentPosition, 'assetId' | 'investedCents'>): InvestmentPosition {
  return {
    accountId: 'acc',
    accountName: 'Conta',
    symbol: overrides.assetId,
    name: null,
    assetType: 'STOCK',
    currency: 'BRL',
    quantity: '10',
    averageUnitCostCents: 0,
    marketValueCents: null,
    quote: null,
    ...overrides,
  };
}

const quote = (isStale: boolean) => ({ priceCents: 1, currency: 'BRL' as const, referenceAt: '2026-10-20T00:00:00Z', fetchedAt: '2026-10-20T00:00:00Z', source: 'BRAPI' as const, isStale });

describe('summarizeCurrency', () => {
  const positions = [
    position({ assetId: 'A', investedCents: 100_00, marketValueCents: 130_00, quote: quote(false) }),
    position({ assetId: 'B', investedCents: 200_00, marketValueCents: 180_00, assetType: 'FII', quote: quote(true) }),
    position({ assetId: 'C', investedCents: 50_00, assetType: 'FIXED_INCOME' }),
    position({ assetId: 'D', investedCents: 10_00, currency: 'USD', marketValueCents: 12_00 }),
  ];

  it('soma mercado e resultado apenas das posições com cotação', () => {
    const summary = summarizeCurrency(positions, 'BRL');
    expect(summary.marketValue).toBe(310_00);
    expect(summary.pricedCost).toBe(300_00);
    expect(summary.gain).toBe(10_00);
    expect(summary.gainPercent).toBeCloseTo(3.33, 1);
    expect(summary.costBasis).toBe(350_00);
  });

  it('estima o valor com mercado onde há cotação e custo onde não há, sem zerar nada', () => {
    const summary = summarizeCurrency(positions, 'BRL');
    expect(summary.estimatedValue).toBe(360_00);
    expect(summary.atCostValue).toBe(50_00);
    expect(summary.ranked.map((item) => Math.round(item.sharePercent))).toEqual([50, 36, 14]);
    expect(summarizeCurrency([], 'BRL')).toMatchObject({ estimatedValue: 0, atCostValue: 0 });
  });

  it('conta cobertura e cotações antigas sem misturar moedas', () => {
    const summary = summarizeCurrency(positions, 'BRL');
    expect([summary.positionCount, summary.pricedCount, summary.unpricedCount, summary.staleCount]).toEqual([3, 2, 1, 1]);
    expect(summarizeCurrency(positions, 'USD').marketValue).toBe(12_00);
  });

  it('ordena por valor e usa custo, sem resultado, quando não há cotação', () => {
    const { ranked } = summarizeCurrency(positions, 'BRL');
    expect(ranked.map((item) => item.position.assetId)).toEqual(['B', 'A', 'C']);
    expect(ranked[2]).toMatchObject({ priced: false, gain: null, gainPercent: null, value: 50_00 });
    expect(ranked[0].weightPercent).toBe(100);
    expect(ranked[1].gain).toBe(30_00);
  });

  it('agrupa a alocação por tipo e as fatias somam 100%', () => {
    const { allocation } = summarizeCurrency(positions, 'BRL');
    expect(allocation.map((slice) => slice.type)).toEqual(['FII', 'STOCK', 'FIXED_INCOME']);
    expect(allocation.reduce((sum, slice) => sum + slice.share, 0)).toBeCloseTo(100);
  });

  it('não inventa percentual sem custo cotado', () => {
    const summary = summarizeCurrency([position({ assetId: 'C', investedCents: 50_00 })], 'BRL');
    expect(summary).toMatchObject({ marketValue: 0, gain: 0, gainPercent: null, unpricedCount: 1 });
  });

  it('informa a referência da cotação mais recente', () => {
    const older = { ...quote(false), referenceAt: '2026-10-01T10:00:00Z' };
    const newer = { ...quote(false), referenceAt: '2026-10-22T10:00:00Z' };
    const summary = summarizeCurrency([
      position({ assetId: 'A', investedCents: 1, marketValueCents: 2, quote: older }),
      position({ assetId: 'B', investedCents: 1, marketValueCents: 2, quote: newer }),
      position({ assetId: 'C', investedCents: 1 }),
    ], 'BRL');
    expect(summary.latestQuoteAt).toBe('2026-10-22T10:00:00Z');
    expect(summarizeCurrency([position({ assetId: 'C', investedCents: 1 })], 'BRL').latestQuoteAt).toBeNull();
  });

  it('considera antiga só a cotação com referência de mais de 7 dias, não a que expirou no cache', () => {
    const now = new Date('2026-10-26T12:00:00Z');
    const fresh = { ...quote(true), referenceAt: '2026-10-25T10:00:00Z' };
    const old = { ...quote(true), referenceAt: '2026-10-10T10:00:00Z' };
    const summary = summarizeCurrency([
      position({ assetId: 'A', investedCents: 1, marketValueCents: 2, quote: fresh }),
      position({ assetId: 'B', investedCents: 1, marketValueCents: 2, quote: old }),
      position({ assetId: 'C', investedCents: 1 }),
    ], 'BRL', now);
    expect(summary.staleCount).toBe(2);
    expect(summary.oldQuoteCount).toBe(1);
  });

  it('lida com carteira vazia', () => {
    expect(summarizeCurrency([], 'BRL')).toMatchObject({ positionCount: 0, ranked: [], allocation: [] });
  });
});

describe('portfolioCurrencies', () => {
  it('lista as moedas presentes na ordem fixa', () => {
    expect(portfolioCurrencies({ positions: [position({ assetId: 'D', investedCents: 1, currency: 'USD' })], totalsByCurrency: { BRL: 5 } })).toEqual(['BRL', 'USD']);
    expect(portfolioCurrencies({ positions: [], totalsByCurrency: {} })).toEqual([]);
  });
});
