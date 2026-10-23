import { describe, expect, it } from 'vitest';

import { formatMoneyDisplay, maskMoneyInput, moneyValueToCents } from '@/app/lib/currency/money-mask';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';

describe('maskMoneyInput', () => {
  it('empurra os dígitos pela direita dos centavos', () => {
    expect(maskMoneyInput('1')).toBe('0,01');
    expect(maskMoneyInput('0,015')).toBe('0,15');
    expect(maskMoneyInput('R$ 12,345')).toBe('123,45');
    expect(maskMoneyInput('1234567')).toBe('12345,67');
  });

  it('limpa o campo sem dígitos e ignora zeros à esquerda', () => {
    expect(maskMoneyInput('')).toBe('');
    expect(maskMoneyInput('R$ ')).toBe('');
    expect(maskMoneyInput('000')).toBe('');
    expect(maskMoneyInput('0001')).toBe('0,01');
  });

  it('limita o tamanho para manter centavos como inteiro seguro', () => {
    const value = maskMoneyInput('9'.repeat(30));
    expect(Number.isSafeInteger(moneyValueToCents(value))).toBe(true);
  });

  it('gera valor aceito por parseMoneyInputToCents', () => {
    expect(parseMoneyInputToCents(maskMoneyInput('85000'))).toBe(85_000);
  });
});

describe('valores negativos', () => {
  it('só mantém o sinal quando o campo permite', () => {
    expect(maskMoneyInput('-1234')).toBe('12,34');
    expect(maskMoneyInput('-1234', true)).toBe('-12,34');
    expect(maskMoneyInput('-', true)).toBe('');
    expect(formatMoneyDisplay('-12,34')).toBe('-R$ 12,34');
    expect(moneyValueToCents('-12,34')).toBe(-1_234);
  });

  it('formata sem símbolo quando ele é exibido ao lado', () => {
    expect(formatMoneyDisplay('1234,5', 'BRL', false)).toBe('1.234,50');
  });
});

describe('formatMoneyDisplay', () => {
  it('formata com símbolo e milhar', () => {
    expect(formatMoneyDisplay('1234,56')).toBe('R$ 1.234,56');
    expect(formatMoneyDisplay('1234,56', 'USD')).toBe('US$ 1.234,56');
    expect(formatMoneyDisplay('0,05', 'EUR')).toBe('€ 0,05');
  });

  it('aceita valores iniciais em outros formatos e vazio', () => {
    expect(formatMoneyDisplay('850')).toBe('R$ 850,00');
    expect(formatMoneyDisplay('850.5')).toBe('R$ 850,50');
    expect(formatMoneyDisplay('')).toBe('');
    expect(formatMoneyDisplay('abc')).toBe('');
  });
});
