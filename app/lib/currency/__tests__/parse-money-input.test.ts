import { describe, expect, it } from 'vitest';

import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';

describe('parseMoneyInputToCents', () => {
  it('converte valores decimais e símbolos monetários conhecidos para centavos', () => {
    expect(parseMoneyInputToCents('800,00')).toBe(80_000);
    expect(parseMoneyInputToCents('R$ 12,34')).toBe(1_234);
    expect(parseMoneyInputToCents('US$ 10.50')).toBe(1_050);
    expect(parseMoneyInputToCents('€ 9,5')).toBe(950);
  });

  it('rejeita sinal negativo e texto arbitrário em vez de sanitizá-los silenciosamente', () => {
    expect(parseMoneyInputToCents('-10')).toBeNull();
    expect(parseMoneyInputToCents('abc10')).toBeNull();
    expect(parseMoneyInputToCents('10abc')).toBeNull();
    expect(parseMoneyInputToCents('0')).toBeNull();
  });
});
