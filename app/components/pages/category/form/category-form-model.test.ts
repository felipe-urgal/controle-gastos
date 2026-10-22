import { describe, expect, it } from 'vitest';

import {
  categoryNameSuggestions,
  categoryTypeLocked,
  isMonthlyLimitInvalid,
  readMonthlyLimit,
} from '@/app/components/pages/category/form/category-form-model';

const now = new Date(2026, 9, 22);

describe('readMonthlyLimit', () => {
  it('lê o valor em centavos no mês atual', () => {
    expect(readMonthlyLimit({ type: 'EXPENSE', value: '1.200,50'.replace('.', ''), currency: 'BRL', now })).toEqual({
      amount: 120_050,
      year: 2026,
      month: 10,
      currency: 'BRL',
    });
  });

  it('só vale para despesa', () => {
    expect(readMonthlyLimit({ type: 'INCOME', value: '500', currency: 'BRL', now })).toBeNull();
  });

  it('ignora campo vazio, zero e texto inválido', () => {
    for (const value of ['', '   ', '0', '0,00', 'abc', '-5']) {
      expect(readMonthlyLimit({ type: 'EXPENSE', value, currency: 'BRL', now })).toBeNull();
    }
  });

  it('respeita a moeda escolhida', () => {
    expect(readMonthlyLimit({ type: 'EXPENSE', value: '100', currency: 'USD', now })?.currency).toBe('USD');
  });
});

describe('isMonthlyLimitInvalid', () => {
  it('só acusa erro quando há texto e ele não é um valor válido', () => {
    expect(isMonthlyLimitInvalid('')).toBe(false);
    expect(isMonthlyLimitInvalid('  ')).toBe(false);
    expect(isMonthlyLimitInvalid('350,00')).toBe(false);
    expect(isMonthlyLimitInvalid('abc')).toBe(true);
    expect(isMonthlyLimitInvalid('0')).toBe(true);
  });
});

describe('tipo e sugestões', () => {
  it('trava o tipo na edição, nunca na criação', () => {
    expect(categoryTypeLocked(true)).toBe(true);
    expect(categoryTypeLocked(false)).toBe(false);
  });

  it('sugere nomes por tipo', () => {
    expect(categoryNameSuggestions('EXPENSE')).toContain('Mercado');
    expect(categoryNameSuggestions('INCOME')).toContain('Salário');
  });
});
