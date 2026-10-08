import { describe, expect, it } from 'vitest';

import {
  assertExchangeRate,
  consolidateCurrencyAmounts,
  convertCurrencyAmount,
  checkedSumCents,
  exchangeRateProvenance,
} from '@/app/lib/currency/exchange-rate-domain';
import type { ExchangeRate } from '@/app/types/exchange-rate';

const usdToBrl: ExchangeRate = {
  from: 'USD',
  to: 'BRL',
  numerator: 532,
  denominator: 100,
  source: 'MANUAL',
  quoteSide: 'GENERIC',
  referenceDate: { year: 2026, month: 9, day: 28 },
};

describe('exchange rate domain', () => {
  it('mantém mesma moeda sem conversão nem taxa artificial', () => {
    expect(
      convertCurrencyAmount(
        { amount: 12_345, currency: 'BRL' },
        'BRL',
        null,
      ),
    ).toEqual({
      original: { amount: 12_345, currency: 'BRL' },
      converted: { amount: 12_345, currency: 'BRL' },
      rate: null,
    });
  });

  it('converte USD para BRL com razão inteira e arredondamento em centavos', () => {
    expect(
      convertCurrencyAmount(
        { amount: 10_001, currency: 'USD' },
        'BRL',
        usdToBrl,
      ),
    ).toMatchObject({
      original: { amount: 10_001, currency: 'USD' },
      converted: { amount: 53_205, currency: 'BRL' },
      rate: usdToBrl,
    });
  });

  it('arredonda valores negativos simetricamente em centavos', () => {
    expect(
      convertCurrencyAmount(
        { amount: -101, currency: 'USD' },
        'BRL',
        {
          ...usdToBrl,
          numerator: 3,
          denominator: 2,
        },
      )?.converted.amount,
    ).toBe(-152);
  });

  it('suporta taxa muito pequena sem usar float como fonte de verdade', () => {
    const eurToBrl: ExchangeRate = {
      from: 'EUR',
      to: 'BRL',
      numerator: 1,
      denominator: 10_000,
      source: 'MANUAL',
      quoteSide: 'GENERIC',
      referenceDate: { year: 2026, month: 9, day: 28 },
    };

    expect(
      convertCurrencyAmount(
        { amount: 15_000, currency: 'EUR' },
        'BRL',
        eurToBrl,
      )?.converted.amount,
    ).toBe(2);
  });

  it('rejeita taxa zero, negativa, mesma moeda e data inválida', () => {
    expect(() =>
      assertExchangeRate({ ...usdToBrl, numerator: 0 }),
    ).toThrow(/inteiro positivo/);
    expect(() =>
      assertExchangeRate({ ...usdToBrl, denominator: -1 }),
    ).toThrow(/inteiro positivo/);
    expect(() =>
      assertExchangeRate({ ...usdToBrl, from: 'BRL', to: 'BRL' }),
    ).toThrow(/moedas diferentes/);
    expect(() =>
      assertExchangeRate({
        ...usdToBrl,
        referenceDate: { year: 2026, month: 2, day: 30 },
      }),
    ).toThrow(/Data de referência inválida/);
  });

  it('não consolida silenciosamente quando falta uma taxa', () => {
    const result = consolidateCurrencyAmounts({
      baseCurrency: 'BRL',
      items: [
        { amount: 10_000, currency: 'BRL' },
        { amount: 5_000, currency: 'USD' },
        { amount: 8_000, currency: 'EUR' },
      ],
      rates: [usdToBrl],
    });

    expect(result.complete).toBe(false);
    expect(result.total).toBeNull();
    expect(result.convertedItems).toHaveLength(2);
    expect(result.missingRates).toEqual([{ from: 'EUR', to: 'BRL' }]);
  });

  it('soma somente depois de converter tudo para a mesma moeda base', () => {
    const result = consolidateCurrencyAmounts({
      baseCurrency: 'BRL',
      items: [
        { amount: 10_000, currency: 'BRL' },
        { amount: 5_000, currency: 'USD' },
      ],
      rates: [usdToBrl],
    });

    expect(result).toMatchObject({
      complete: true,
      baseCurrency: 'BRL',
      total: 36_600,
      missingRates: [],
    });
  });

  it('soma consolidada com checagem de inteiro seguro', () => {
    expect(checkedSumCents([1, 2, -3])).toBe(0);
    expect(checkedSumCents([Number.MAX_SAFE_INTEGER, -1])).toBe(
      Number.MAX_SAFE_INTEGER - 1,
    );
    expect(() => checkedSumCents([Number.MAX_SAFE_INTEGER, 1])).toThrow(
      /excede/,
    );
    expect(() =>
      consolidateCurrencyAmounts({
        items: [
          { amount: Number.MAX_SAFE_INTEGER, currency: 'BRL' },
          { amount: 1, currency: 'BRL' },
        ],
        baseCurrency: 'BRL',
        rates: [],
      }),
    ).toThrow(/excede/);
  });

  it('classifica proveniência: manual, PTAX direta e cross derivada', () => {
    expect(
      exchangeRateProvenance({ source: 'MANUAL', from: 'USD', to: 'EUR' }),
    ).toBe('MANUAL');
    expect(
      exchangeRateProvenance({ source: 'BCB_PTAX', from: 'USD', to: 'BRL' }),
    ).toBe('PTAX_DIRECT');
    expect(
      exchangeRateProvenance({ source: 'BCB_PTAX', from: 'BRL', to: 'EUR' }),
    ).toBe('PTAX_DIRECT');
    expect(
      exchangeRateProvenance({ source: 'BCB_PTAX', from: 'USD', to: 'EUR' }),
    ).toBe('PTAX_CROSS');
  });
});
