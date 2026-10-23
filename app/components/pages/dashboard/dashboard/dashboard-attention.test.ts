import { describe, expect, it } from 'vitest';

import { buildAttentionItems, MAX_ATTENTION_ITEMS } from '@/app/components/pages/dashboard/dashboard/dashboard-attention';
import type { FinancialCommitment } from '@/app/types/financial-commitment';
import type { DashboardCreditCard, DashboardRecentTransaction } from '@/app/types/dashboard';
import type { FinancialInsight } from '@/app/types/financial-insight';

const asOf = { year: 2026, month: 10, day: 22 };

function card(id: string, dueDay: number, amount = 124_000): DashboardCreditCard {
  return {
    id,
    name: `Cartão ${id}`,
    currency: 'BRL',
    color: '#000000',
    icon: 'credit-card',
    creditLimit: 500_000,
    usedLimit: amount,
    availableLimit: 500_000 - amount,
    overLimit: 0,
    nextStatement: {
      amount,
      closingDate: { year: 2026, month: 10, day: 10 },
      dueDate: { year: 2026, month: 10, day: dueDay },
      transactionCount: 3,
    },
  };
}

function transaction(id: string, withCategory: boolean, kind: DashboardRecentTransaction['kind'] = 'NORMAL'): DashboardRecentTransaction {
  return {
    id,
    amount: 1_000,
    type: 'EXPENSE',
    kind,
    description: `Compra ${id}`,
    status: 'COMPLETED',
    year: 2026,
    month: 10,
    day: 20,
    transferRole: null,
    account: { id: 'a1', name: 'Conta', currency: 'BRL' },
    counterpartAccount: null,
    category: withCategory ? { id: 'c1', name: 'Mercado', color: '#000000', icon: 'tag' } : null,
  };
}

function budgetInsight(state: 'NEAR' | 'OVER'): FinancialInsight {
  return {
    id: `budget-${state}`,
    type: 'CATEGORY_BUDGET',
    period: { year: 2026, month: 10 },
    currency: 'BRL',
    message: 'Lazer está perto do limite',
    href: '/categorias',
    data: { categoryId: 'c1', categoryName: 'Lazer', state, budget: 45_000, consumption: 61_000, percentage: 136 },
  };
}

const base = { asOf, showValues: true, currency: 'BRL' };

describe('buildAttentionItems', () => {
  it('inclui fatura que vence em até 7 dias e marca como urgente quando faltam 3 ou menos', () => {
    const items = buildAttentionItems({
      ...base,
      cards: [card('soon', 24), card('later', 29)],
      recentTransactions: [],
      insights: [],
    });

    expect(items.map((item) => item.id)).toEqual(['card-due-soon', 'card-due-later']);
    expect(items[0]).toMatchObject({ tone: 'urgent', title: 'Fatura Cartão soon vence em 2 dias', href: '/contas/show/soon' });
    expect(items[1].tone).toBe('warning');
  });

  it('ignora fatura distante, sem valor ou sem fechamento', () => {
    const noStatement = { ...card('none', 24), nextStatement: null };
    const items = buildAttentionItems({
      ...base,
      cards: [card('far', 30), card('zero', 24, 0), noStatement],
      recentTransactions: [],
      insights: [],
    });

    expect(items).toEqual([]);
  });

  it('avisa fatura vencida em vez de esconder', () => {
    const items = buildAttentionItems({ ...base, cards: [card('late', 20)], recentTransactions: [], insights: [] });

    expect(items[0]).toMatchObject({ tone: 'urgent', title: 'Fatura Cartão late venceu' });
  });

  it('conta só transações normais sem categoria', () => {
    const items = buildAttentionItems({
      ...base,
      cards: [],
      recentTransactions: [transaction('1', false), transaction('2', false), transaction('3', true), transaction('4', false, 'TRANSFER')],
      insights: [],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'uncategorized-recent', title: '2 transações recentes sem categoria', href: '/transacoes' });
  });

  it('usa a forma singular para uma transação sem categoria', () => {
    const items = buildAttentionItems({ ...base, cards: [], recentTransactions: [transaction('1', false)], insights: [] });

    expect(items[0].title).toBe('1 transação recente sem categoria');
  });

  it('ordena por gravidade mantendo a ordem original dentro do mesmo nível', () => {
    const items = buildAttentionItems({
      ...base,
      cards: [card('soon', 24)],
      recentTransactions: [transaction('1', false)],
      insights: [budgetInsight('NEAR'), budgetInsight('OVER')],
    });

    expect(items.map((item) => item.tone)).toEqual(['urgent', 'warning', 'info']);
    expect(items[1].id).toBe('insight-budget-OVER');
  });

  it('limita o total de itens', () => {
    const cards = Array.from({ length: 8 }, (_, index) => card(String(index), 23));
    const items = buildAttentionItems({ ...base, cards, recentTransactions: [], insights: [] });

    expect(items).toHaveLength(MAX_ATTENTION_ITEMS);
  });

  it('respeita valores ocultos nos detalhes', () => {
    const items = buildAttentionItems({ ...base, showValues: false, cards: [card('soon', 24)], recentTransactions: [], insights: [] });

    expect(items[0].detail).not.toMatch(/1\.240/);
  });

  it('troca o texto estatístico da anomalia por uma frase simples', () => {
    const anomaly = {
      id: 'anomaly-lazer',
      type: 'SPENDING_ANOMALY',
      period: { year: 2026, month: 10 },
      currency: 'BRL',
      message: 'Lazer está 382.7% acima da mediana de 6 meses com histórico. MAD de 8495 e z-score modificado de 8.6.',
      href: '/categorias',
      data: {
        categoryId: 'c1',
        categoryName: 'Lazer',
        currentAmount: 136_112,
        baselineMedian: 28_198,
        difference: 107_914,
        percentageDifference: 382.7,
        sampleSize: 6,
        baselineMad: 8_495,
        modifiedZScore: 8.6,
        rule: 'MODIFIED_Z_SCORE',
      },
    } as FinancialInsight;
    const items = buildAttentionItems({ ...base, cards: [], recentTransactions: [], insights: [anomaly] });

    expect(items[0].title).toBe('Lazer está 4,8x acima do normal');
    expect(items[0].title).not.toMatch(/MAD|z-score/i);
  });

  it('não mostra insights apenas informativos', () => {
    const recurring = { id: 'r', type: 'RECURRING_SHARE', period: { year: 2026, month: 10 }, currency: 'BRL', message: 'x', href: null, data: { monthlyEquivalent: 1, knownMonthlyExpense: 1, percentage: 233.8 } } as FinancialInsight;
    const items = buildAttentionItems({ ...base, cards: [], recentTransactions: [], insights: [recurring] });

    expect(items).toEqual([]);
  });

  describe('contas a pagar', () => {
    const payable = (id: string, day: number, overrides: Partial<FinancialCommitment> = {}): FinancialCommitment => ({
      id,
      type: 'PENDING',
      direction: 'PAYABLE',
      state: 'UPCOMING',
      title: `Conta ${id}`,
      amount: 3_000,
      currency: 'BRL',
      date: { year: 2026, month: 10, day },
      href: `/transacoes/show/${id}`,
      accountName: null,
      source: { kind: 'TRANSACTION', id },
      ...overrides,
    });

    it('lista conta a pagar próxima e ignora a distante, a sem valor e a fatura', () => {
      const items = buildAttentionItems({
        ...base,
        cards: [],
        recentTransactions: [],
        insights: [],
        commitments: [
          payable('near', 27),
          payable('far', 31),
          payable('milestone', 25, { amount: null }),
          payable('statement', 25, { type: 'CARD_STATEMENT' }),
          payable('income', 25, { direction: 'RECEIVABLE' }),
        ],
      });

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ id: 'payable-near', title: 'Pagar Conta near', tone: 'warning', href: '/transacoes/show/near' });
    });

    it('marca conta vencida como urgente', () => {
      const items = buildAttentionItems({
        ...base,
        cards: [],
        recentTransactions: [],
        insights: [],
        commitments: [payable('late', 10, { state: 'OVERDUE' })],
      });

      expect(items[0]).toMatchObject({ tone: 'urgent' });
      expect(items[0].detail).toContain('venceu');
    });

    it('usa o insight de pendências só quando os compromissos não carregaram', () => {
      const upcoming = { id: 'u', type: 'UPCOMING_PENDING', period: { year: 2026, month: 10 }, currency: 'BRL', message: '1 despesa pendente', href: '/transacoes', data: { count: 1, amount: 3_000, from: asOf, through: { year: 2026, month: 10, day: 29 } } } as FinancialInsight;

      expect(buildAttentionItems({ ...base, cards: [], recentTransactions: [], insights: [upcoming], commitments: null })).toHaveLength(1);
      expect(buildAttentionItems({ ...base, cards: [], recentTransactions: [], insights: [upcoming], commitments: [] })).toEqual([]);
    });
  });

  it('convida a definir o orçamento quando o mês não tem nenhum', () => {
    const items = buildAttentionItems({ ...base, cards: [], recentTransactions: [], insights: [], budgetMissing: true });

    expect(items[0]).toMatchObject({ id: 'budget-missing', href: '/categorias', action: 'Definir' });
  });
});
