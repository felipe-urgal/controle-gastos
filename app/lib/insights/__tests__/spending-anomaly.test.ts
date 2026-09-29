import { describe, expect, it } from 'vitest';
import {
  buildSpendingAnomalyInsights,
  SPENDING_ANOMALY_MIN_SAMPLE,
} from '@/app/lib/insights/financial-insights-domain';

describe('deterministic spending anomalies', () => {
  it('flags a category only with enough history and a material increase', () => {
    const items = buildSpendingAnomalyInsights({
      period: { year: 2026, month: 9 },
      currency: 'BRL',
      categorySpendingSeries: [{
        category: { id: 'food', name: 'Alimentação' },
        currentAmount: 30_000,
        history: [10_000, 11_000, 9_000, 10_000, 12_000, 10_500],
      }],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: 'SPENDING_ANOMALY',
      data: {
        categoryId: 'food',
        currentAmount: 30_000,
        sampleSize: 6,
      },
    });
  });

  it('omits sparse histories and ordinary variation', () => {
    expect(buildSpendingAnomalyInsights({
      period: { year: 2026, month: 9 },
      currency: 'BRL',
      categorySpendingSeries: [{
        category: { id: 'sparse', name: 'Esporádico' },
        currentAmount: 30_000,
        history: Array(SPENDING_ANOMALY_MIN_SAMPLE - 1).fill(10_000),
      }],
    })).toEqual([]);

    expect(buildSpendingAnomalyInsights({
      period: { year: 2026, month: 9 },
      currency: 'BRL',
      categorySpendingSeries: [{
        category: { id: 'stable', name: 'Estável' },
        currentAmount: 12_000,
        history: [10_000, 11_000, 10_500, 9_500],
      }],
    })).toEqual([]);
  });

  it('ignores zero-only history instead of inventing a percentage', () => {
    expect(buildSpendingAnomalyInsights({
      period: { year: 2026, month: 9 },
      currency: 'BRL',
      categorySpendingSeries: [{
        category: { id: 'new', name: 'Nova' },
        currentAmount: 50_000,
        history: [0, 0, 0, 0, 0, 0],
      }],
    })).toEqual([]);
  });
});
