import { describe, expect, it } from 'vitest';

import {
  buildFiscalPtaxIndex,
  findPtaxOnOrBefore,
  FISCAL_PTAX_LOOKBACK_DAYS,
} from '@/app/lib/currency/fiscal-ptax-resolver';
import type { ExchangeRateModel } from '@/app/types/exchange-rate';

let seq = 0;
function rate(overrides: Partial<ExchangeRateModel>): ExchangeRateModel {
  seq += 1;
  return {
    id: `r${seq}`,
    provenance: 'PTAX_DIRECT',
    from: 'USD',
    to: 'BRL',
    numerator: 530,
    denominator: 100,
    source: 'BCB_PTAX',
    quoteSide: 'SELL',
    referenceDate: { year: 2026, month: 9, day: 28 },
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
    ...overrides,
  };
}

const date = { year: 2026, month: 9, day: 28 };

describe('findPtaxOnOrBefore', () => {
  it('taxa MANUAL nunca satisfaz requisito fiscal', () => {
    const index = buildFiscalPtaxIndex([
      rate({ source: 'MANUAL', quoteSide: 'GENERIC', provenance: 'MANUAL' }),
    ]);
    expect(
      findPtaxOnOrBefore({ index, currency: 'USD', date, quoteSide: 'SELL' }),
    ).toBeNull();
  });

  it('manual + PTAX na mesma data ⇒ usa PTAX e devolve metadados', () => {
    const ptax = rate({ numerator: 520 });
    const index = buildFiscalPtaxIndex([
      rate({ source: 'MANUAL', quoteSide: 'GENERIC', numerator: 999 }),
      ptax,
    ]);
    const found = findPtaxOnOrBefore({
      index,
      currency: 'USD',
      date,
      quoteSide: 'SELL',
    });
    expect(found).toMatchObject({
      source: 'BCB_PTAX',
      quoteSide: 'SELL',
      effectiveDate: date,
      ageDays: 0,
    });
    expect(found?.rate.numerator).toBe(520);
  });

  it('BUY não satisfaz SELL e vice-versa', () => {
    const index = buildFiscalPtaxIndex([rate({ quoteSide: 'BUY' })]);
    expect(
      findPtaxOnOrBefore({ index, currency: 'USD', date, quoteSide: 'SELL' }),
    ).toBeNull();
    expect(
      findPtaxOnOrBefore({ index, currency: 'USD', date, quoteSide: 'BUY' }),
    ).not.toBeNull();
  });

  it('respeita lookback máximo e ignora taxa futura', () => {
    const old = rate({
      referenceDate: { year: 2026, month: 9, day: 28 - FISCAL_PTAX_LOOKBACK_DAYS },
    });
    const tooOld = rate({
      referenceDate: { year: 2026, month: 9, day: 27 - FISCAL_PTAX_LOOKBACK_DAYS },
    });
    const future = rate({ referenceDate: { year: 2026, month: 9, day: 29 } });
    expect(
      findPtaxOnOrBefore({
        index: buildFiscalPtaxIndex([old, future]),
        currency: 'USD',
        date,
        quoteSide: 'SELL',
      })?.ageDays,
    ).toBe(FISCAL_PTAX_LOOKBACK_DAYS);
    expect(
      findPtaxOnOrBefore({
        index: buildFiscalPtaxIndex([tooOld, future]),
        currency: 'USD',
        date,
        quoteSide: 'SELL',
      }),
    ).toBeNull();
  });

  it('cross derivada (USD→EUR) e BRL nunca entram no índice fiscal', () => {
    const index = buildFiscalPtaxIndex([
      rate({ to: 'EUR', provenance: 'PTAX_CROSS' }),
      rate({ from: 'BRL', to: 'USD' }),
    ]);
    expect(index.size).toBe(0);
    expect(
      findPtaxOnOrBefore({ index, currency: 'BRL', date, quoteSide: 'SELL' }),
    ).toBeNull();
  });

  it('índice com anos de PTAX resolve sem varrer o histórico', () => {
    const rates: ExchangeRateModel[] = [];
    for (let day = 0; day < 3 * 365; day += 1) {
      const d = new Date(Date.UTC(2024, 0, 1 + day));
      for (const quoteSide of ['BUY', 'SELL'] as const) {
        rates.push(
          rate({
            quoteSide,
            referenceDate: {
              year: d.getUTCFullYear(),
              month: d.getUTCMonth() + 1,
              day: d.getUTCDate(),
            },
          }),
        );
      }
    }
    const index = buildFiscalPtaxIndex(rates);
    const started = performance.now();
    for (let i = 0; i < 1_000; i += 1) {
      expect(
        findPtaxOnOrBefore({ index, currency: 'USD', date, quoteSide: 'BUY' }),
      ).not.toBeNull();
    }
    expect(performance.now() - started).toBeLessThan(500);
  });
});
