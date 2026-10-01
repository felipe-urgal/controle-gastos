import { describe, expect, it } from 'vitest';

import {
  buildFinancialInsights,
  buildGoalDelayedInsights,
  buildIncomeChangeInsight,
  buildPossibleSubscriptionInsights,
  buildSafeToSpendInsight,
  buildSubscriptionPriceInsights,
  FINANCIAL_INSIGHT_LIMIT,
} from '@/app/lib/insights/financial-insights-domain';

const period = { year: 2026, month: 10 };
const asOf = { year: 2026, month: 10, day: 15 };

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'streaming',
    status: 'POSSIBLE' as const,
    description: 'Streaming',
    currency: 'BRL' as const,
    currentAmount: 3_000,
    monthlyEquivalent: 3_000,
    annualEquivalent: 36_000,
    occurrenceCount: 5,
    nextCharge: { year: 2026, month: 11, day: 2 },
    possiblyEnded: false,
    priceChange: {
      previousAmount: 2_000,
      currentAmount: 3_000,
      difference: 1_000,
      percent: 50,
    },
    ...overrides,
  };
}

describe('financial insights v2', () => {
  it('sinaliza safe-to-spend negativo ou baixo somente no período atual', () => {
    expect(
      buildSafeToSpendInsight({
        period,
        currency: 'BRL',
        asOf,
        safeToSpend: {
          realizedBalance: 100_000,
          pendingExpenses: 80_000,
          cardCommitments: 30_000,
          transferNet: 0,
          safeToSpend: -10_000,
        },
      }),
    ).toMatchObject({
      id: 'safe-to-spend:30d',
      type: 'SAFE_TO_SPEND',
      data: {
        state: 'NEGATIVE',
        safeToSpend: -10_000,
      },
    });

    expect(
      buildSafeToSpendInsight({
        period,
        currency: 'BRL',
        asOf,
        safeToSpend: {
          realizedBalance: 100_000,
          pendingExpenses: 85_000,
          cardCommitments: 5_000,
          transferNet: 0,
          safeToSpend: 10_000,
        },
      }),
    ).toMatchObject({
      data: { state: 'LOW', percentageOfRealized: 10 },
    });

    expect(
      buildSafeToSpendInsight({
        period: { year: 2026, month: 9 },
        currency: 'BRL',
        asOf,
        safeToSpend: {
          realizedBalance: 100_000,
          pendingExpenses: 110_000,
          cardCommitments: 0,
          transferNet: 0,
          safeToSpend: -10_000,
        },
      }),
    ).toBeNull();
  });

  it('gera aumento de assinatura e possível assinatura com IDs estáveis e isolamento por moeda', () => {
    const price = buildSubscriptionPriceInsights({
      period,
      currency: 'BRL',
      asOf,
      subscriptions: [subscription()],
    });
    expect(price).toEqual([
      expect.objectContaining({
        id: 'subscription-price:streaming',
        type: 'SUBSCRIPTION_PRICE_CHANGE',
        currency: 'BRL',
        data: {
          subscriptionId: 'streaming',
          description: 'Streaming',
          status: 'POSSIBLE',
          previousAmount: 2_000,
          currentAmount: 3_000,
          difference: 1_000,
          percentage: 50,
        },
      }),
    ]);

    const possible = buildPossibleSubscriptionInsights({
      period,
      currency: 'BRL',
      asOf,
      subscriptions: [subscription()],
    });
    expect(possible[0]).toMatchObject({
      id: 'possible-subscription:streaming',
      type: 'POSSIBLE_SUBSCRIPTION',
    });

    expect(
      buildSubscriptionPriceInsights({
        period,
        currency: 'USD',
        asOf,
        subscriptions: [subscription()],
      }),
    ).toEqual([]);

    const composed = buildFinancialInsights({
      period,
      currency: 'BRL',
      asOf,
      categoryBudgets: [],
      pendingExpenses: [],
      recurringMonthlyEquivalent: null,
      knownMonthlyExpense: null,
      forecastAccounts: [],
      subscriptions: [subscription()],
    });
    expect(composed.map((item) => item.id)).toEqual([
      'subscription-price:streaming',
    ]);
  });

  it('detecta queda material de receita sem sinalizar ruído pequeno ou ausência de base', () => {
    expect(
      buildIncomeChangeInsight({
        period: { year: 2026, month: 9 },
        currency: 'BRL',
        asOf,
        incomeChange: {
          currentIncome: 70_000,
          previousIncome: 100_000,
          previousPeriod: { year: 2026, month: 8 },
        },
      }),
    ).toMatchObject({
      id: 'income-change:previous-period',
      type: 'INCOME_CHANGE',
      data: {
        currentIncome: 70_000,
        previousIncome: 100_000,
        difference: -30_000,
        percentage: 30,
      },
    });

    expect(
      buildIncomeChangeInsight({
        period: { year: 2026, month: 9 },
        currency: 'BRL',
        asOf,
        incomeChange: {
          currentIncome: 99_500,
          previousIncome: 100_000,
          previousPeriod: { year: 2026, month: 8 },
        },
      }),
    ).toBeNull();

    expect(
      buildIncomeChangeInsight({
        period: { year: 2026, month: 9 },
        currency: 'BRL',
        asOf,
        incomeChange: {
          currentIncome: 0,
          previousIncome: 0,
          previousPeriod: { year: 2026, month: 8 },
        },
      }),
    ).toBeNull();

    expect(
      buildIncomeChangeInsight({
        period,
        currency: 'BRL',
        asOf,
        incomeChange: {
          currentIncome: 10_000,
          previousIncome: 100_000,
          previousPeriod: { year: 2026, month: 9 },
        },
      }),
    ).toBeNull();
  });

  it('sinaliza meta vencida sem transformar meta futura em alerta', () => {
    const items = buildGoalDelayedInsights({
      period,
      currency: 'BRL',
      asOf,
      goals: [
        {
          id: 'late',
          name: 'Reserva',
          targetAmount: 100_000,
          currentAmount: 60_000,
          remainingAmount: 40_000,
          targetDate: { year: 2026, month: 10, day: 10 },
        },
        {
          id: 'future',
          name: 'Viagem',
          targetAmount: 50_000,
          currentAmount: 10_000,
          remainingAmount: 40_000,
          targetDate: { year: 2026, month: 11, day: 1 },
        },
      ],
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: 'goal-delayed:late',
        type: 'GOAL_DELAYED',
        href: '/metas',
      }),
    ]);
  });

  it('prioriza risco antes de materialidade, deduplica o mesmo assunto e respeita o limite global', () => {
    const items = buildFinancialInsights({
      period,
      currency: 'BRL',
      asOf,
      categoryBudgets: [
        {
          category: { id: 'housing', name: 'Moradia' },
          budget: 100_000,
          consumption: 120_000,
        },
        {
          category: { id: 'food', name: 'Alimentação' },
          budget: 100_000,
          consumption: 90_000,
        },
      ],
      pendingExpenses: [{ amount: 15_000, date: asOf }],
      recurringMonthlyEquivalent: 20_000,
      knownMonthlyExpense: 100_000,
      forecastAccounts: [
        { realizedBalance: 20_000, projectedBalance: -5_000 },
      ],
      safeToSpend: {
        realizedBalance: 20_000,
        pendingExpenses: 25_000,
        cardCommitments: 10_000,
        transferNet: 0,
        safeToSpend: -15_000,
      },
      subscriptions: [subscription()],
      incomeChange: {
        currentIncome: 60_000,
        previousIncome: 100_000,
        previousPeriod: { year: 2026, month: 9 },
      },
      goals: [
        {
          id: 'late',
          name: 'Reserva',
          targetAmount: 100_000,
          currentAmount: 50_000,
          remainingAmount: 50_000,
          targetDate: { year: 2026, month: 10, day: 1 },
        },
      ],
    });

    expect(items).toHaveLength(FINANCIAL_INSIGHT_LIMIT);
    expect(items[0]?.type).toBe('FORECAST_BALANCE');
    expect(items[1]?.type).toBe('SAFE_TO_SPEND');
    expect(items.map((item) => item.id)).not.toContain(
      'possible-subscription:streaming',
    );
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
  });

  it('permanece vazio quando não há sinal material', () => {
    expect(
      buildFinancialInsights({
        period,
        currency: 'EUR',
        asOf,
        categoryBudgets: [],
        pendingExpenses: [],
        recurringMonthlyEquivalent: null,
        knownMonthlyExpense: null,
        forecastAccounts: [],
        safeToSpend: {
          realizedBalance: 100_000,
          pendingExpenses: 10_000,
          cardCommitments: 0,
          transferNet: 0,
          safeToSpend: 90_000,
        },
        subscriptions: [],
        incomeChange: null,
        goals: [],
      }),
    ).toEqual([]);
  });
});
