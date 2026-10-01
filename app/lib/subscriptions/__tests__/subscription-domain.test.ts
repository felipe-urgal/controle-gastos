import { describe, expect, it } from 'vitest';

import { detectSubscriptions } from '@/app/lib/subscriptions/subscription-domain';

function tx(overrides: Partial<{
  id: string;
  amount: number;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  year: number;
  month: number;
  day: number;
  accountId: string;
  currency: string;
  categoryId: string;
  merchantId: string | null;
  merchantName: string;
}> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    amount: overrides.amount ?? 4990,
    description: overrides.description ?? 'Streaming',
    type: overrides.type ?? 'EXPENSE',
    year: overrides.year ?? 2026,
    month: overrides.month ?? 1,
    day: overrides.day ?? 10,
    account: {
      id: overrides.accountId ?? 'account-1',
      name: 'Conta',
      currency: overrides.currency ?? 'BRL',
    },
    category: {
      id: overrides.categoryId ?? 'category-1',
      name: 'Assinaturas',
    },
    merchant: overrides.merchantId
      ? {
          id: overrides.merchantId,
          name: overrides.merchantName ?? 'Streaming Co',
        }
      : null,
  };
}

describe('subscription-domain', () => {
  it('detecta assinatura mensal e calcula equivalentes', () => {
    const result = detectSubscriptions([
      tx({ id: '1', month: 1 }),
      tx({ id: '2', month: 2 }),
      tx({ id: '3', month: 3 }),
    ], { year: 2026, month: 3, day: 15 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      frequency: 'MONTHLY',
      interval: 1,
      currentAmount: 4990,
      monthlyEquivalent: 4990,
      annualEquivalent: 59880,
      occurrenceCount: 3,
      possiblyEnded: false,
    });
  });

  it('detecta assinatura anual', () => {
    const result = detectSubscriptions([
      tx({ id: '1', year: 2024, month: 2, day: 29, amount: 120000 }),
      tx({ id: '2', year: 2025, month: 2, day: 28, amount: 120000 }),
      tx({ id: '3', year: 2026, month: 2, day: 28, amount: 120000 }),
    ], { year: 2026, month: 3, day: 1 });

    expect(result[0]).toMatchObject({
      frequency: 'YEARLY',
      interval: 1,
      monthlyEquivalent: 10000,
      annualEquivalent: 120000,
      nextCharge: { year: 2027, month: 2, day: 28 },
    });
  });

  it('detecta aumento estrutural de preço com duas cobranças no novo valor', () => {
    const result = detectSubscriptions([
      tx({ id: '1', month: 1, amount: 4490 }),
      tx({ id: '2', month: 2, amount: 4490 }),
      tx({ id: '3', month: 3, amount: 5590 }),
      tx({ id: '4', month: 4, amount: 5590 }),
    ], { year: 2026, month: 4, day: 15 });

    expect(result[0]?.priceChange).toEqual({
      previousAmount: 4490,
      currentAmount: 5590,
      difference: 1100,
      percent: 24.5,
    });
    expect(result[0]?.currentAmount).toBe(5590);
  });

  it('não trata oscilação normal como mudança estrutural de preço', () => {
    const result = detectSubscriptions([
      tx({ id: '1', month: 1, amount: 5000 }),
      tx({ id: '2', month: 2, amount: 5050 }),
      tx({ id: '3', month: 3, amount: 4980 }),
      tx({ id: '4', month: 4, amount: 5020 }),
    ], { year: 2026, month: 4, day: 15 });

    expect(result[0]?.priceChange).toBeNull();
  });

  it('ignora compra avulsa do mesmo merchant e preserva a cadência principal', () => {
    const common = { merchantId: 'merchant-1', merchantName: 'Netflix' };
    const result = detectSubscriptions([
      tx({ id: '1', month: 1, day: 10, ...common }),
      tx({ id: 'extra', month: 1, day: 22, amount: 1990, ...common }),
      tx({ id: '2', month: 2, day: 10, ...common }),
      tx({ id: '3', month: 3, day: 10, ...common }),
    ], { year: 2026, month: 3, day: 15 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      description: 'Netflix',
      occurrenceCount: 3,
    });
    expect(result[0]?.evidence.map((item) => item.id)).toEqual(['1', '2', '3']);
    expect(result[0]?.explanation).toContain('1 compra(s) avulsa(s) foram desconsideradas');
  });

  it('não mistura moedas, contas ou receitas', () => {
    const result = detectSubscriptions([
      tx({ id: '1', month: 1 }),
      tx({ id: '2', month: 2, currency: 'USD' }),
      tx({ id: '3', month: 3 }),
      tx({ id: '4', month: 1, accountId: 'account-2' }),
      tx({ id: '5', month: 2, accountId: 'account-2' }),
      tx({ id: '6', month: 3, accountId: 'account-2', type: 'INCOME' }),
    ], { year: 2026, month: 3, day: 15 });

    expect(result).toHaveLength(0);
  });

  it('sinaliza cancelamento aparente quando passam mais de dois ciclos esperados', () => {
    const result = detectSubscriptions([
      tx({ id: '1', month: 1 }),
      tx({ id: '2', month: 2 }),
      tx({ id: '3', month: 3 }),
    ], { year: 2026, month: 6, day: 20 });

    expect(result[0]?.possiblyEnded).toBe(true);
  });
});
