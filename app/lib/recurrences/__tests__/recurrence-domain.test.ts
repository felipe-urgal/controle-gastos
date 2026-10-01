import { describe, expect, it } from 'vitest';

import {
  detectRecurrenceCandidates,
  normalizeRecurrenceDescription,
  recurrenceEquivalents,
} from '@/app/lib/recurrences/recurrence-domain';

function tx(overrides: Partial<{
  id: string;
  amount: number;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  year: number;
  month: number;
  day: number;
  accountId: string;
  accountName: string;
  currency: string;
  categoryId: string;
  categoryName: string;
  merchantId: string | null;
  merchantName: string;
}> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    amount: overrides.amount ?? 9990,
    description: overrides.description ?? 'Streaming Premium',
    type: overrides.type ?? 'EXPENSE',
    year: overrides.year ?? 2026,
    month: overrides.month ?? 1,
    day: overrides.day ?? 10,
    account: {
      id: overrides.accountId ?? 'account-1',
      name: overrides.accountName ?? 'Conta',
      currency: overrides.currency ?? 'BRL',
    },
    category: {
      id: overrides.categoryId ?? 'category-1',
      name: overrides.categoryName ?? 'Assinaturas',
    },
    merchant: overrides.merchantId
      ? {
          id: overrides.merchantId,
          name: overrides.merchantName ?? 'Streaming Co',
        }
      : null,
  };
}

describe('recurrence-domain', () => {
  it('normaliza descrição de forma determinística', () => {
    expect(normalizeRecurrenceDescription('  Café   São-Paulo #42 ')).toBe(
      'cafe sao paulo 42',
    );
  });

  it('calcula equivalentes sem somar moedas ou usar valor financeiro em float', () => {
    expect(recurrenceEquivalents(12000, 'MONTHLY', 1)).toEqual({
      monthlyEquivalent: 12000,
      annualEquivalent: 144000,
    });
    expect(recurrenceEquivalents(12000, 'YEARLY', 1)).toEqual({
      monthlyEquivalent: 1000,
      annualEquivalent: 12000,
    });
  });

  it('detecta mensal com pequena variação de valor e retorna evidências explicáveis', () => {
    const candidates = detectRecurrenceCandidates([
      tx({ id: '1', month: 1, amount: 10000 }),
      tx({ id: '2', month: 2, amount: 10100 }),
      tx({ id: '3', month: 3, amount: 9900 }),
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      frequency: 'MONTHLY',
      interval: 1,
      amount: 10000,
      minAmount: 9900,
      maxAmount: 10100,
      variableAmount: true,
      occurrenceCount: 3,
      type: 'EXPENSE',
    });
    expect(candidates[0]?.evidence.map((item) => item.id)).toEqual(['1', '2', '3']);
    expect(candidates[0]?.explanation).toContain('3 ocorrências');
    expect(candidates[0]?.explanation).toContain('descrição normalizada');
  });

  it('detecta semanal, quinzenal e trimestral apenas nas combinações suportadas', () => {
    const weekly = detectRecurrenceCandidates([
      tx({ id: 'w1', month: 1, day: 1 }),
      tx({ id: 'w2', month: 1, day: 8 }),
      tx({ id: 'w3', month: 1, day: 15 }),
    ]);
    expect(weekly[0]).toMatchObject({ frequency: 'WEEKLY', interval: 1 });

    const fortnightly = detectRecurrenceCandidates([
      tx({ id: 'f1', month: 1, day: 1 }),
      tx({ id: 'f2', month: 1, day: 15 }),
      tx({ id: 'f3', month: 1, day: 29 }),
    ]);
    expect(fortnightly[0]).toMatchObject({ frequency: 'WEEKLY', interval: 2 });

    const quarterly = detectRecurrenceCandidates([
      tx({ id: 'q1', month: 1, day: 10 }),
      tx({ id: 'q2', month: 4, day: 10 }),
      tx({ id: 'q3', month: 7, day: 10 }),
    ]);
    expect(quarterly[0]).toMatchObject({ frequency: 'MONTHLY', interval: 3 });
  });

  it('detecta recorrência anual preservando borda de fevereiro', () => {
    const candidates = detectRecurrenceCandidates([
      tx({ id: 'y1', year: 2024, month: 2, day: 29, amount: 120000 }),
      tx({ id: 'y2', year: 2025, month: 2, day: 28, amount: 120000 }),
      tx({ id: 'y3', year: 2026, month: 2, day: 28, amount: 120000 }),
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      frequency: 'YEARLY',
      interval: 1,
      nextOccurrence: { year: 2027, month: 2, day: 28 },
      monthlyEquivalent: 10000,
      annualEquivalent: 120000,
    });
  });

  it('aceita desvio de até três dias sem alterar a cadência mensal', () => {
    const candidates = detectRecurrenceCandidates([
      tx({ id: 'd1', month: 1, day: 10 }),
      tx({ id: 'd2', month: 2, day: 12 }),
      tx({ id: 'd3', month: 3, day: 8 }),
    ]);

    expect(candidates[0]).toMatchObject({
      frequency: 'MONTHLY',
      interval: 1,
      occurrenceCount: 3,
    });
  });

  it('prefere merchant e agrupa descrições diferentes do mesmo estabelecimento', () => {
    const candidates = detectRecurrenceCandidates([
      tx({ id: 'm1', month: 1, description: 'NETFLIX 0123', merchantId: 'merchant-1', merchantName: 'Netflix' }),
      tx({ id: 'm2', month: 2, description: 'NETFLIX.COM 4567', merchantId: 'merchant-1', merchantName: 'Netflix' }),
      tx({ id: 'm3', month: 3, description: 'PG * NETFLIX 8910', merchantId: 'merchant-1', merchantName: 'Netflix' }),
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      description: 'Netflix',
      merchant: { id: 'merchant-1', name: 'Netflix' },
      occurrenceCount: 3,
    });
    expect(candidates[0]?.explanation).toContain('mesmo estabelecimento (Netflix)');
  });

  it('não mistura conta, moeda, tipo ou merchant diferentes', () => {
    expect(
      detectRecurrenceCandidates([
        tx({ id: '1', month: 1 }),
        tx({ id: '2', month: 2, accountId: 'account-2' }),
        tx({ id: '3', month: 3 }),
      ]),
    ).toHaveLength(0);

    expect(
      detectRecurrenceCandidates([
        tx({ id: '1', month: 1 }),
        tx({ id: '2', month: 2, currency: 'USD' }),
        tx({ id: '3', month: 3 }),
      ]),
    ).toHaveLength(0);

    expect(
      detectRecurrenceCandidates([
        tx({ id: '1', month: 1, type: 'EXPENSE' }),
        tx({ id: '2', month: 2, type: 'INCOME' }),
        tx({ id: '3', month: 3, type: 'EXPENSE' }),
      ]),
    ).toHaveLength(0);

    expect(
      detectRecurrenceCandidates([
        tx({ id: '1', month: 1, merchantId: 'merchant-1' }),
        tx({ id: '2', month: 2, merchantId: 'merchant-2' }),
        tx({ id: '3', month: 3, merchantId: 'merchant-1' }),
      ]),
    ).toHaveLength(0);
  });

  it('detecta receitas recorrentes sem misturá-las com despesas', () => {
    const candidates = detectRecurrenceCandidates([
      tx({ id: 'i1', month: 1, type: 'INCOME', description: 'Salário' }),
      tx({ id: 'i2', month: 2, type: 'INCOME', description: 'Salário' }),
      tx({ id: 'i3', month: 3, type: 'INCOME', description: 'Salário' }),
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ type: 'INCOME', frequency: 'MONTHLY' });
  });

  it('não agrupa descrições diferentes nem valores fora da tolerância', () => {
    expect(
      detectRecurrenceCandidates([
        tx({ id: '1', month: 1, description: 'Serviço A' }),
        tx({ id: '2', month: 2, description: 'Serviço B' }),
        tx({ id: '3', month: 3, description: 'Serviço A' }),
      ]),
    ).toHaveLength(0);

    expect(
      detectRecurrenceCandidates([
        tx({ id: '1', month: 1, amount: 10000 }),
        tx({ id: '2', month: 2, amount: 10000 }),
        tx({ id: '3', month: 3, amount: 15000 }),
      ]),
    ).toHaveLength(0);
  });

  it('rejeita falso positivo quando a cadência não é consistente', () => {
    expect(
      detectRecurrenceCandidates([
        tx({ id: '1', month: 1, day: 1 }),
        tx({ id: '2', month: 2, day: 20 }),
        tx({ id: '3', month: 3, day: 3 }),
      ]),
    ).toHaveLength(0);
  });
});
