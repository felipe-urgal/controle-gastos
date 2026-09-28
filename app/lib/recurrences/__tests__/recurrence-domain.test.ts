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
  year: number;
  month: number;
  day: number;
}> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    amount: overrides.amount ?? 9990,
    description: overrides.description ?? 'Streaming Premium',
    year: overrides.year ?? 2026,
    month: overrides.month ?? 1,
    day: overrides.day ?? 10,
    account: {
      id: 'account-1',
      name: 'Conta',
      currency: 'BRL',
    },
    category: {
      id: 'category-1',
      name: 'Assinaturas',
    },
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

  it('detecta mensal com pequena variação de valor', () => {
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
    });
  });

  it('detecta semanal e trimestral apenas nas combinações suportadas', () => {
    const weekly = detectRecurrenceCandidates([
      tx({ id: 'w1', month: 1, day: 1 }),
      tx({ id: 'w2', month: 1, day: 8 }),
      tx({ id: 'w3', month: 1, day: 15 }),
    ]);
    expect(weekly[0]).toMatchObject({ frequency: 'WEEKLY', interval: 1 });

    const quarterly = detectRecurrenceCandidates([
      tx({ id: 'q1', month: 1, day: 10 }),
      tx({ id: 'q2', month: 4, day: 10 }),
      tx({ id: 'q3', month: 7, day: 10 }),
    ]);
    expect(quarterly[0]).toMatchObject({ frequency: 'MONTHLY', interval: 3 });
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
});
