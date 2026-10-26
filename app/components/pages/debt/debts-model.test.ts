import { describe, expect, it } from 'vitest';

import { daysUntil, installmentLoad, owedCurrencies, summarizeDebts } from '@/app/components/pages/debt/debts-model';
import type { Debt } from '@/app/types/debt';

const today = { year: 2026, month: 10, day: 23 };

function debt(id: string, overrides: Partial<Debt> = {}): Debt {
  return {
    id,
    name: id,
    currency: 'BRL',
    balance: 1_000_00,
    installmentAmount: 100_00,
    dueDate: '2026-11-05',
    remainingInstallments: 3,
    institution: null,
    description: null,
    status: 'ACTIVE',
    adjustmentCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('daysUntil / dueLabel', () => {
  it('conta dias entre datas lógicas', () => {
    expect(daysUntil('2026-10-23', today)).toBe(0);
    expect(daysUntil('2026-10-28', today)).toBe(5);
    expect(daysUntil('2026-10-20', today)).toBe(-3);
    expect(daysUntil('2026-11-05', today)).toBe(13);
  });
});

describe('summarizeDebts', () => {
  const debts = [
    debt('carro', { balance: 18_750_00, installmentAmount: 1_250_00, dueDate: '2026-11-05', remainingInstallments: 15 }),
    debt('emprestimo', { balance: 7_350_00, installmentAmount: 612_50, dueDate: '2026-10-28', remainingInstallments: 12 }),
    debt('notebook', { balance: 2_100_00, installmentAmount: 350_00, dueDate: '2026-10-20', remainingInstallments: 6 }),
    debt('cartao', { balance: 980_00, installmentAmount: null, dueDate: null, remainingInstallments: null }),
    debt('quitada', { status: 'PAID', balance: 0 }),
    debt('arquivada', { status: 'ARCHIVED', balance: 500_00 }),
    debt('usd', { currency: 'USD', balance: 4_200_00 }),
  ];

  it('soma o saldo devedor sem arquivadas, quitadas nem outra moeda', () => {
    const summary = summarizeDebts(debts, 'BRL', today);
    expect(summary.owedCents).toBe(18_750_00 + 7_350_00 + 2_100_00 + 980_00);
    expect(summary.activeCount).toBe(4);
  });

  it('soma parcelas só das dívidas que informam parcela e conta as que não informam', () => {
    const summary = summarizeDebts(debts, 'BRL', today);
    expect(summary.monthlyInstallmentCents).toBe(1_250_00 + 612_50 + 350_00);
    expect([summary.withInstallmentCount, summary.withoutInstallmentCount]).toEqual([3, 1]);
  });

  it('separa vencidas, próximas e o próximo vencimento', () => {
    const summary = summarizeDebts(debts, 'BRL', today);
    expect(summary.overdue.map((item) => [item.debt.id, item.daysLate])).toEqual([['notebook', 3]]);
    expect(summary.dueSoon.map((item) => item.id)).toEqual(['emprestimo']);
    expect(summary.nextDue).toMatchObject({ days: 5, debt: { id: 'emprestimo' } });
  });

  it('estima o mês da última parcela', () => {
    expect(summarizeDebts(debts, 'BRL', today).lastInstallment).toEqual({ year: 2028, month: 1 });
    expect(summarizeDebts([debt('x', { installmentAmount: null })], 'BRL', today).lastInstallment).toBeNull();
  });

  it('calcula o peso de cada dívida e ordena pelo saldo', () => {
    const { weights } = summarizeDebts(debts, 'BRL', today);
    expect(weights[0].debt.id).toBe('carro');
    expect(weights.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(100);
  });

  it('lida com moeda sem dívidas', () => {
    expect(summarizeDebts(debts, 'EUR', today)).toMatchObject({ owedCents: 0, activeCount: 0, nextDue: null, weights: [] });
  });
});

describe('owedCurrencies', () => {
  it('lista moedas com saldo devedor na ordem fixa', () => {
    expect(owedCurrencies([debt('a', { currency: 'USD' }), debt('b'), debt('c', { currency: 'EUR', status: 'ARCHIVED' })])).toEqual(['BRL', 'USD']);
  });
});

describe('installmentLoad', () => {
  it('distribui as parcelas restantes a partir do mês do vencimento', () => {
    const load = installmentLoad([debt('a', { dueDate: '2026-11-05', remainingInstallments: 3, installmentAmount: 100_00 })], 'BRL', today);
    expect(load).toHaveLength(12);
    expect(load[0]).toMatchObject({ year: 2026, month: 10, cents: 0 });
    expect(load.slice(1, 4).map((item) => item.cents)).toEqual([100_00, 100_00, 100_00]);
    expect(load[4].cents).toBe(0);
  });

  it('soma dívidas no mesmo mês e conta as parcelas', () => {
    const load = installmentLoad([debt('a'), debt('b', { installmentAmount: 50_00 })], 'BRL', today);
    expect(load[1]).toMatchObject({ cents: 150_00, count: 2 });
  });

  it('põe no mês atual a parcela vencida e ignora as seguintes que ficaram para trás', () => {
    const load = installmentLoad([debt('atrasada', { dueDate: '2026-08-10', remainingInstallments: 5, installmentAmount: 100_00 })], 'BRL', today);
    // ago (vencida, vai para o mês atual) + out (a parcela do próprio mês); set fica de fora; nov e dez seguem.
    expect(load[0].cents).toBe(200_00);
    expect(load[1]).toMatchObject({ month: 11, cents: 100_00 });
    expect(load.reduce((sum, item) => sum + item.cents, 0)).toBe(400_00);
  });

  it('ignora dívida sem parcela, sem data, inativa ou de outra moeda e corta no horizonte', () => {
    const ignored = [
      debt('sem-parcela', { installmentAmount: null }),
      debt('sem-data', { dueDate: null }),
      debt('quitada', { status: 'PAID' }),
      debt('usd', { currency: 'USD' }),
    ];
    expect(installmentLoad(ignored, 'BRL', today).every((item) => item.cents === 0)).toBe(true);
    const long = installmentLoad([debt('longa', { remainingInstallments: 60 })], 'BRL', today);
    expect(long.filter((item) => item.cents > 0)).toHaveLength(11);
  });
});
