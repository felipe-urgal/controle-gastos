import { describe, expect, it } from 'vitest';

import {
  accountNameSuggestions,
  accountStructureLock,
  describeCardCycle,
  readCardCycle,
} from '@/app/components/pages/account/form/account-form-model';

describe('readCardCycle', () => {
  it('lê os dois dias e marca vencimento no mês seguinte quando ele vem antes do fechamento', () => {
    expect(readCardCycle('10', '24')).toEqual({ closingDay: 10, dueDay: 24, dueNextMonth: false });
    expect(readCardCycle(25, 5)).toEqual({ closingDay: 25, dueDay: 5, dueNextMonth: true });
    expect(readCardCycle(10, 10)).toMatchObject({ dueNextMonth: true });
  });

  it('devolve null para dia vazio, zero, decimal ou texto', () => {
    expect(readCardCycle('', '10')).toBeNull();
    expect(readCardCycle('0', '10')).toBeNull();
    expect(readCardCycle('1.5', '10')).toBeNull();
    expect(readCardCycle('abc', '10')).toBeNull();
  });

  it('limita o dia a 31', () => {
    expect(readCardCycle('45', '31')).toMatchObject({ closingDay: 31, dueDay: 31 });
  });
});

describe('describeCardCycle', () => {
  it('explica em que fatura a compra entra', () => {
    expect(describeCardCycle('10', '24')).toBe(
      'Compras feitas até o dia 10 entram na fatura que vence no dia 24. Depois do dia 10, entram na fatura seguinte.',
    );
  });

  it('avisa quando o vencimento é no mês seguinte', () => {
    expect(describeCardCycle('25', '5')).toContain('no dia 5 do mês seguinte');
  });

  it('pede os dias enquanto não forem válidos', () => {
    expect(describeCardCycle('', '')).toBe('Informe o dia em que a fatura fecha e o dia em que você paga.');
  });
});

describe('accountStructureLock', () => {
  it('trava só na edição de conta com histórico', () => {
    expect(accountStructureLock(true, { hasFinancialHistory: true })).toEqual({ typeAndCurrency: true, cardCycle: true });
    expect(accountStructureLock(true, { hasFinancialHistory: false })).toEqual({ typeAndCurrency: false, cardCycle: false });
    expect(accountStructureLock(false, { hasFinancialHistory: true })).toEqual({ typeAndCurrency: false, cardCycle: false });
  });

  it('não trava quando a leitura não informou o histórico', () => {
    expect(accountStructureLock(true, { hasFinancialHistory: null })).toEqual({ typeAndCurrency: false, cardCycle: false });
    expect(accountStructureLock(true, undefined)).toEqual({ typeAndCurrency: false, cardCycle: false });
  });
});

describe('accountNameSuggestions', () => {
  it('sugere nomes por tipo', () => {
    expect(accountNameSuggestions('CREDIT_CARD')).toContain('Cartão principal');
    expect(accountNameSuggestions('INVESTMENT').length).toBeGreaterThan(0);
  });
});
