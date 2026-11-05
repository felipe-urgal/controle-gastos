import { describe, expect, it } from 'vitest';

import {
  compareDebtStrategies,
  parseMonthlyRateBps,
  simulateDebtPayoff,
  type SimulatorDebt,
} from '@/app/lib/debts/debt-simulator';

const card: SimulatorDebt = { id: 'card', name: 'Cartão', balance: 100_000, monthlyPayment: 20_000, monthlyRateBps: 1_000 };
const loan: SimulatorDebt = { id: 'loan', name: 'Empréstimo', balance: 50_000, monthlyPayment: 10_000, monthlyRateBps: 200 };

describe('simulateDebtPayoff', () => {
  it('sem juros e só parcelas, quita no tempo das parcelas', () => {
    const result = simulateDebtPayoff({
      debts: [{ id: 'a', name: 'A', balance: 30_000, monthlyPayment: 10_000, monthlyRateBps: 0 }],
      strategy: 'INSTALLMENTS_ONLY',
      extraMonthly: 5_000,
      lumpSum: 0,
    });
    expect(result).toMatchObject({ monthsToPayoff: 3, totalPaid: 30_000, totalInterest: 0 });
    expect(result.payoffMonthByDebt).toEqual({ a: 3 });
  });

  it('aplica juros em centavos inteiros a cada mês', () => {
    const result = simulateDebtPayoff({
      debts: [{ id: 'a', name: 'A', balance: 10_000, monthlyPayment: 5_500, monthlyRateBps: 1_000 }],
      strategy: 'INSTALLMENTS_ONLY',
      extraMonthly: 0,
      lumpSum: 0,
    });
    // mês 1: 10.000 + 1.000 - 5.500 = 5.500; mês 2: 5.500 + 550 = 6.050, paga 5.500; mês 3: 550 + 55 = 605.
    expect(result.monthsToPayoff).toBe(3);
    expect(result.totalInterest).toBe(1_000 + 550 + 55);
    expect(result.totalPaid).toBe(10_000 + 1_605);
  });

  it('devolve null quando a parcela não cobre os juros', () => {
    const result = simulateDebtPayoff({
      debts: [{ id: 'a', name: 'A', balance: 100_000, monthlyPayment: 5_000, monthlyRateBps: 1_000 }],
      strategy: 'INSTALLMENTS_ONLY',
      extraMonthly: 0,
      lumpSum: 0,
    });
    expect(result.monthsToPayoff).toBeNull();
  });

  it('dívida sem parcela só é paga pelo extra', () => {
    const debts: SimulatorDebt[] = [{ id: 'a', name: 'A', balance: 20_000, monthlyPayment: null, monthlyRateBps: 0 }];
    expect(
      simulateDebtPayoff({ debts, strategy: 'INSTALLMENTS_ONLY', extraMonthly: 0, lumpSum: 0 }).monthsToPayoff,
    ).toBeNull();
    expect(
      simulateDebtPayoff({ debts, strategy: 'SNOWBALL', extraMonthly: 10_000, lumpSum: 0 }).monthsToPayoff,
    ).toBe(2);
  });

  it('marca juro não informado em vez de tratá-lo como informado', () => {
    const result = simulateDebtPayoff({
      debts: [{ ...loan, monthlyRateBps: null }, card],
      strategy: 'AVALANCHE',
      extraMonthly: 0,
      lumpSum: 0,
    });
    expect(result.unknownRateDebtIds).toEqual(['loan']);
  });
});

describe('compareDebtStrategies', () => {
  it('maior juro primeiro paga menos juros que menor saldo primeiro quando o saldo grande tem o juro maior', () => {
    const { baseline, avalanche, snowball } = compareDebtStrategies({
      debts: [card, loan],
      extraMonthly: 10_000,
      lumpSum: 0,
    });
    expect(avalanche.monthsToPayoff).not.toBeNull();
    expect(snowball.monthsToPayoff).not.toBeNull();
    expect(avalanche.totalInterest).toBeLessThan(snowball.totalInterest);
    expect(snowball.totalInterest).toBeLessThan(baseline.totalInterest);
    expect(avalanche.monthsToPayoff!).toBeLessThan(baseline.monthsToPayoff!);
  });

  it('o extra liberado por uma dívida quitada rola para a próxima', () => {
    const { baseline, snowball } = compareDebtStrategies({
      debts: [
        { id: 'a', name: 'A', balance: 10_000, monthlyPayment: 10_000, monthlyRateBps: 0 },
        { id: 'b', name: 'B', balance: 30_000, monthlyPayment: 10_000, monthlyRateBps: 0 },
      ],
      extraMonthly: 0,
      lumpSum: 0,
    });
    expect(baseline.monthsToPayoff).toBe(3);
    // Rolando a parcela de A (mês 1) para B: 10k + 20k no mês 2 → fecha em 2 meses.
    expect(snowball.monthsToPayoff).toBe(2);
    expect(snowball.payoffMonthByDebt).toEqual({ a: 1, b: 2 });
  });

  it('pagamento único vai primeiro para a dívida-alvo da estratégia', () => {
    const result = simulateDebtPayoff({
      debts: [card, loan],
      strategy: 'AVALANCHE',
      extraMonthly: 0,
      lumpSum: 100_000,
    });
    expect(result.payoffMonthByDebt.card).toBe(1);
  });

  it('é determinístico e nunca passa do limite de meses', () => {
    const input = { debts: [card, loan], extraMonthly: 3_000, lumpSum: 0 };
    expect(compareDebtStrategies(input)).toEqual(compareDebtStrategies(input));
  });
});

describe('parseMonthlyRateBps', () => {
  it('converte percentual ao mês em pontos-base e trata vazio como não informado', () => {
    expect(parseMonthlyRateBps('2,5')).toBe(250);
    expect(parseMonthlyRateBps('1.99%')).toBe(199);
    expect(parseMonthlyRateBps('0')).toBe(0);
    expect(parseMonthlyRateBps('')).toBeNull();
    expect(parseMonthlyRateBps('abc')).toBeNull();
    expect(parseMonthlyRateBps('150')).toBeNull();
  });
});
