import { describe, expect, it } from 'vitest';

import {
  buildCategoryBudgetInsights,
  buildFinancialInsights,
  buildForecastBalanceInsight,
  buildRecurringShareInsight,
  buildUpcomingPendingInsight,
  CATEGORY_BUDGET_INSIGHT_LIMIT,
  FINANCIAL_INSIGHT_LIMIT,
} from '@/app/lib/insights/financial-insights-domain';

const period = { year: 2026, month: 9 };
const asOf = { year: 2026, month: 9, day: 28 };

describe('financial insights domain', () => {
  it('omite orçamento sem denominador válido e não inventa percentual', () => {
    expect(
      buildCategoryBudgetInsights({
        period,
        currency: 'BRL',
        categoryBudgets: [
          {
            category: { id: 'zero', name: 'Sem orçamento' },
            budget: 0,
            consumption: 10_000,
          },
        ],
      }),
    ).toEqual([]);
  });

  it('gera apenas categorias próximas/acima do orçamento e limita deterministicamente', () => {
    const items = buildCategoryBudgetInsights({
      period,
      currency: 'BRL',
      categoryBudgets: [
        {
          category: { id: '3', name: 'Transporte' },
          budget: 100_000,
          consumption: 79_000,
        },
        {
          category: { id: '2', name: 'Mercado' },
          budget: 100_000,
          consumption: 80_000,
        },
        {
          category: { id: '1', name: 'Assinaturas' },
          budget: 100_000,
          consumption: 120_000,
        },
        {
          category: { id: '4', name: 'Viagens' },
          budget: 100_000,
          consumption: 90_000,
        },
      ],
    });

    expect(items).toHaveLength(CATEGORY_BUDGET_INSIGHT_LIMIT);
    expect(items.map((item) => item.data.categoryName)).toEqual([
      'Assinaturas',
      'Viagens',
    ]);
    expect(items[0]).toMatchObject({
      type: 'CATEGORY_BUDGET',
      data: { state: 'OVER', percentage: 120 },
    });
    expect(items[1]).toMatchObject({
      data: { state: 'NEAR', percentage: 90 },
    });
  });

  it('considera próximos 7 dias de forma inclusiva e ignora período histórico', () => {
    const current = buildUpcomingPendingInsight({
      period,
      currency: 'BRL',
      asOf,
      pendingExpenses: [
        { amount: 1_000, date: asOf },
        { amount: 2_000, date: { year: 2026, month: 10, day: 4 } },
        { amount: 3_000, date: { year: 2026, month: 10, day: 5 } },
      ],
    });

    expect(current).toMatchObject({
      type: 'UPCOMING_PENDING',
      data: { count: 2, amount: 3_000, through: { year: 2026, month: 10, day: 4 } },
    });

    expect(
      buildUpcomingPendingInsight({
        period: { year: 2026, month: 8 },
        currency: 'BRL',
        asOf,
        pendingExpenses: [{ amount: 1_000, date: asOf }],
      }),
    ).toBeNull();
  });

  it('omite peso recorrente quando despesa conhecida é zero e calcula quando definida', () => {
    expect(
      buildRecurringShareInsight({
        period,
        currency: 'BRL',
        asOf,
        recurringMonthlyEquivalent: 20_000,
        knownMonthlyExpense: 0,
      }),
    ).toBeNull();

    expect(
      buildRecurringShareInsight({
        period,
        currency: 'BRL',
        asOf,
        recurringMonthlyEquivalent: 25_000,
        knownMonthlyExpense: 100_000,
      }),
    ).toMatchObject({
      type: 'RECURRING_SHARE',
      data: { percentage: 25 },
    });
  });

  it('omite forecast sem contas ou sem variação e consolida somente a moeda fornecida', () => {
    expect(
      buildForecastBalanceInsight({
        period,
        currency: 'USD',
        asOf,
        forecastAccounts: [],
      }),
    ).toBeNull();

    expect(
      buildForecastBalanceInsight({
        period,
        currency: 'USD',
        asOf,
        forecastAccounts: [
          { realizedBalance: 10_000, projectedBalance: 12_000 },
          { realizedBalance: 5_000, projectedBalance: 4_000 },
        ],
      }),
    ).toMatchObject({
      currency: 'USD',
      data: {
        currentBalance: 15_000,
        projectedBalance: 16_000,
        difference: 1_000,
      },
    });
  });

  it('aplica limite global em ordem fixa e não usa ranking subjetivo', () => {
    const items = buildFinancialInsights({
      period,
      currency: 'BRL',
      asOf,
      categoryBudgets: [
        {
          category: { id: 'a', name: 'Alimentação' },
          budget: 100_000,
          consumption: 85_000,
        },
        {
          category: { id: 'b', name: 'Casa' },
          budget: 100_000,
          consumption: 90_000,
        },
        {
          category: { id: 'c', name: 'Saúde' },
          budget: 100_000,
          consumption: 95_000,
        },
      ],
      pendingExpenses: [{ amount: 1_000, date: asOf }],
      recurringMonthlyEquivalent: 20_000,
      knownMonthlyExpense: 100_000,
      forecastAccounts: [
        { realizedBalance: 50_000, projectedBalance: 45_000 },
      ],
    });

    expect(items).toHaveLength(FINANCIAL_INSIGHT_LIMIT);
    expect(items.map((item) => item.type)).toEqual([
      'FORECAST_BALANCE',
      'UPCOMING_PENDING',
      'CATEGORY_BUDGET',
      'CATEGORY_BUDGET',
      'RECURRING_SHARE',
    ]);
  });
});
