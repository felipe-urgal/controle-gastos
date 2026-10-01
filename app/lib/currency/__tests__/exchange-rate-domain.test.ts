import { describe, expect, it } from 'vitest';

import {
  assertExchangeRate,
  consolidateCurrencyAmounts,
  convertCurrencyAmount,
  latestRateOnOrBefore,
} from '@/app/lib/currency/exchange-rate-domain';
import type { ExchangeRate } from '@/app/types/exchange-rate';

const usdToBrl: ExchangeRate = {
  from: 'USD',
  to: 'BRL',
  numerator: 532,
  denominator: 100,
  source: 'MANUAL',
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

  it('prefere taxa manual quando manual e PTAX têm a mesma data', () => {
    const selected = latestRateOnOrBefore({
      rates: [
        { ...usdToBrl, source: 'BCB_PTAX', numerator: 530 },
        { ...usdToBrl, source: 'MANUAL', numerator: 540 },
      ],
      from: 'USD',
      to: 'BRL',
      referenceDate: { year: 2026, month: 9, day: 28 },
    });

    expect(selected).toMatchObject({ source: 'MANUAL', numerator: 540 });
  });

  it('seleciona a taxa histórica mais recente sem usar taxa futura', () => {
    const rates: ExchangeRate[] = [
      {
        ...usdToBrl,
        numerator: 500,
        referenceDate: { year: 2026, month: 9, day: 1 },
      },
      {
        ...usdToBrl,
        numerator: 520,
        referenceDate: { year: 2026, month: 9, day: 15 },
      },
      {
        ...usdToBrl,
        numerator: 540,
        referenceDate: { year: 2026, month: 10, day: 1 },
      },
    ];

    expect(
      latestRateOnOrBefore({
        rates,
        from: 'USD',
        to: 'BRL',
        referenceDate: { year: 2026, month: 9, day: 20 },
      }),
    ).toMatchObject({
      numerator: 520,
      referenceDate: { year: 2026, month: 9, day: 15 },
    });
  });
});
