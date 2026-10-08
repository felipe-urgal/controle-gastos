import { describe, expect, it } from 'vitest';

import { convertCurrencyAmount } from '@/app/lib/currency/exchange-rate-domain';
import { resolvePatrimonyRate } from '@/app/lib/currency/patrimony-rate-resolver';
import type { ExchangeRateModel } from '@/app/types/exchange-rate';

let seq = 0;
function rate(overrides: Partial<ExchangeRateModel>): ExchangeRateModel {
  seq += 1;
  return {
    id: `r${seq}`,
    provenance: 'MANUAL',
    from: 'USD',
    to: 'BRL',
    numerator: 530,
    denominator: 100,
    source: 'MANUAL',
    quoteSide: 'GENERIC',
    referenceDate: { year: 2026, month: 10, day: 4 },
    createdAt: '2026-10-04T00:00:00.000Z',
    updatedAt: '2026-10-04T00:00:00.000Z',
    ...overrides,
  };
}

const asOf = { year: 2026, month: 10, day: 5 };

describe('resolvePatrimonyRate', () => {
  it('nunca usa taxa futura (hoje 05/10, manual 04/10 e 20/10)', () => {
    const resolved = resolvePatrimonyRate({
      rates: [
        rate({ numerator: 540, referenceDate: { year: 2026, month: 10, day: 20 } }),
        rate({ numerator: 530 }),
      ],
      from: 'USD',
      to: 'BRL',
      asOf,
    });
    expect(resolved?.rate.numerator).toBe(530);
    expect(resolved?.resolution).toMatchObject({
      ageDays: 1,
      freshness: 'CURRENT',
    });
  });

  it('retorna null quando só existe taxa futura (ausência, nunca zero)', () => {
    expect(
      resolvePatrimonyRate({
        rates: [
          rate({ referenceDate: { year: 2026, month: 10, day: 6 } }),
        ],
        from: 'USD',
        to: 'BRL',
        asOf,
      }),
    ).toBeNull();
  });

  it('marca taxa antiga como STALE e informa idade', () => {
    const resolved = resolvePatrimonyRate({
      rates: [rate({ referenceDate: { year: 2023, month: 1, day: 2 } })],
      from: 'USD',
      to: 'BRL',
      asOf,
    });
    expect(resolved?.resolution.freshness).toBe('STALE');
    expect(resolved?.resolution.ageDays).toBeGreaterThan(900);
  });

  it('aceita último dia útil anterior (fim de semana) como CURRENT', () => {
    const resolved = resolvePatrimonyRate({
      rates: [rate({ referenceDate: { year: 2026, month: 10, day: 2 } })],
      from: 'USD',
      to: 'BRL',
      asOf: { year: 2026, month: 10, day: 4 },
    });
    expect(resolved?.resolution).toMatchObject({
      ageDays: 2,
      freshness: 'CURRENT',
    });
  });

  it('manual vence PTAX na mesma data e sinaliza override explícito', () => {
    const resolved = resolvePatrimonyRate({
      rates: [
        rate({ source: 'BCB_PTAX', quoteSide: 'SELL', provenance: 'PTAX_DIRECT', numerator: 520 }),
        rate({ numerator: 540 }),
      ],
      from: 'USD',
      to: 'BRL',
      asOf,
    });
    expect(resolved?.rate).toMatchObject({ source: 'MANUAL', numerator: 540 });
    expect(resolved?.resolution.overridesPtax).toBe(true);
  });

  it('sem PTAX na data, manual não é override', () => {
    const resolved = resolvePatrimonyRate({
      rates: [rate({})],
      from: 'USD',
      to: 'BRL',
      asOf,
    });
    expect(resolved?.resolution.overridesPtax).toBe(false);
  });

  it('usa o lado solicitado (SELL padrão) e ignora o oposto', () => {
    const rates = [
      rate({ source: 'BCB_PTAX', quoteSide: 'BUY', provenance: 'PTAX_DIRECT', numerator: 510 }),
      rate({ source: 'BCB_PTAX', quoteSide: 'SELL', provenance: 'PTAX_DIRECT', numerator: 530 }),
    ];
    expect(
      resolvePatrimonyRate({ rates, from: 'USD', to: 'BRL', asOf })?.rate,
    ).toMatchObject({ quoteSide: 'SELL', numerator: 530 });
    expect(
      resolvePatrimonyRate({ rates, from: 'USD', to: 'BRL', asOf, quoteSide: 'BUY' })
        ?.rate,
    ).toMatchObject({ quoteSide: 'BUY', numerator: 510 });
  });

  it('deriva a inversa sem persistir linha e marca derivedFromInverse', () => {
    const resolved = resolvePatrimonyRate({
      rates: [rate({ numerator: 530, denominator: 100 })],
      from: 'BRL',
      to: 'USD',
      asOf,
    });
    expect(resolved?.rate).toMatchObject({
      from: 'BRL',
      to: 'USD',
      numerator: 100,
      denominator: 530,
    });
    expect(resolved?.resolution.derivedFromInverse).toBe(true);
    expect(
      convertCurrencyAmount(
        { amount: 53_000, currency: 'BRL' },
        'USD',
        resolved!.rate,
      )?.converted.amount,
    ).toBe(10_000);
  });

  it('prefere direta a inversa na mesma data', () => {
    const resolved = resolvePatrimonyRate({
      rates: [
        rate({ from: 'BRL', to: 'USD', numerator: 19, denominator: 100 }),
        rate({ numerator: 530, denominator: 100 }),
      ],
      from: 'BRL',
      to: 'USD',
      asOf,
    });
    expect(resolved?.resolution.derivedFromInverse).toBe(false);
    expect(resolved?.rate.numerator).toBe(19);
  });

  it('identifica cross derivada de PTAX e não triangula por BRL', () => {
    const cross = rate({
      from: 'USD',
      to: 'EUR',
      source: 'BCB_PTAX',
      quoteSide: 'SELL',
      provenance: 'PTAX_CROSS',
      numerator: 92,
      denominator: 100,
    });
    expect(
      resolvePatrimonyRate({ rates: [cross], from: 'USD', to: 'EUR', asOf })
        ?.resolution.provenance,
    ).toBe('PTAX_CROSS');
    expect(
      resolvePatrimonyRate({
        rates: [rate({}), rate({ from: 'EUR', numerator: 600 })],
        from: 'USD',
        to: 'EUR',
        asOf,
      }),
    ).toBeNull();
  });
});
