import { describe, expect, it } from 'vitest';
import {
  buildSpendingAnomalyInsights,
  SPENDING_ANOMALY_MIN_SAMPLE,
  SPENDING_ANOMALY_MODIFIED_Z_SCORE_THRESHOLD,
} from '@/app/lib/insights/financial-insights-domain';

describe('deterministic spending anomalies', () => {
  it('detecta outlier material com MAD e explicação estatística', () => {
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
        baselineMedian: 10_250,
        baselineMad: 1000,
        sampleSize: 6,
        rule: 'MODIFIED_Z_SCORE',
      },
    });
    expect(items[0]?.data.modifiedZScore).toBeGreaterThanOrEqual(
      SPENDING_ANOMALY_MODIFIED_Z_SCORE_THRESHOLD,
    );
    expect(items[0]?.message).toContain('z-score modificado');
  });

  it('trata MAD zero explicitamente sem descartar aumento material', () => {
    const items = buildSpendingAnomalyInsights({
      period: { year: 2026, month: 9 },
      currency: 'BRL',
      categorySpendingSeries: [{
        category: { id: 'fixed', name: 'Mensalidade' },
        currentAmount: 20_000,
        history: [10_000, 10_000, 10_000, 10_000, 10_000, 10_000],
      }],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      data: {
        baselineMedian: 10_000,
        baselineMad: 0,
        modifiedZScore: null,
        rule: 'ZERO_MAD_MATERIAL_INCREASE',
      },
    });
    expect(items[0]?.message).toContain('MAD = 0');
  });

  it('não sinaliza crescimento gradual como outlier estatístico', () => {
    expect(buildSpendingAnomalyInsights({
      period: { year: 2026, month: 9 },
      currency: 'BRL',
      categorySpendingSeries: [{
        category: { id: 'trend', name: 'Tendência' },
        currentAmount: 31_000,
        history: [10_000, 14_000, 18_000, 22_000, 26_000, 30_000],
      }],
    })).toEqual([]);
  });

  it('omite histórico curto, variação comum e valores muito baixos', () => {
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

    expect(buildSpendingAnomalyInsights({
      period: { year: 2026, month: 9 },
      currency: 'BRL',
      categorySpendingSeries: [{
        category: { id: 'tiny', name: 'Baixo valor' },
        currentAmount: 900,
        history: [100, 120, 80, 110, 90, 105],
      }],
    })).toEqual([]);
  });

  it('ignora meses sem gasto em vez de tratá-los como zero estatístico', () => {
    const items = buildSpendingAnomalyInsights({
      period: { year: 2026, month: 9 },
      currency: 'BRL',
      categorySpendingSeries: [{
        category: { id: 'sparse-zero', name: 'Irregular' },
        currentAmount: 50_000,
        history: [0, 10_000, 0, 11_000, 0, 9_500],
      }],
    });

    expect(items).toEqual([]);
  });

  it('não sinaliza padrão sazonal simples quando o valor atual cabe na dispersão', () => {
    expect(buildSpendingAnomalyInsights({
      period: { year: 2026, month: 9 },
      currency: 'BRL',
      categorySpendingSeries: [{
        category: { id: 'seasonal', name: 'Sazonal' },
        currentAmount: 22_000,
        history: [10_000, 20_000, 11_000, 21_000, 10_500, 20_500],
      }],
    })).toEqual([]);
  });
});
