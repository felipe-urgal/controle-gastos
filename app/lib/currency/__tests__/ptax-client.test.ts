import { describe, expect, it, vi } from 'vitest';

import { fetchPtaxExchangeRate } from '@/app/lib/currency/ptax-client';

function response(
  rows: Array<{
    cotacaoCompra: number;
    cotacaoVenda: number;
    dataHoraCotacao: string;
  }>,
  status = 200,
) {
  return new Response(JSON.stringify({ value: rows }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('BCB PTAX client', () => {
  it('usa cotação de venda e último dia disponível anterior', async () => {
    const fetchMock = vi.fn(async () =>
      response([{ cotacaoCompra: 5.30, cotacaoVenda: 5.32, dataHoraCotacao: '2026-09-30 13:04:00.000' }]),
    ) as unknown as typeof fetch;

    await expect(
      fetchPtaxExchangeRate(
        {
          from: 'USD',
          to: 'BRL',
          referenceDate: { year: 2026, month: 10, day: 3 },
        },
        fetchMock,
      ),
    ).resolves.toEqual({
      from: 'USD',
      to: 'BRL',
      numerator: 133,
      denominator: 25,
      referenceDate: { year: 2026, month: 9, day: 30 },
      quoteSide: 'SELL',
    });
  });

  it('usa cotação de compra quando solicitado explicitamente', async () => {
    const fetchMock = vi.fn(async () =>
      response([
        {
          cotacaoCompra: 5.30,
          cotacaoVenda: 5.32,
          dataHoraCotacao: '2026-10-01 13:04:00.000',
        },
      ]),
    ) as unknown as typeof fetch;

    await expect(
      fetchPtaxExchangeRate(
        {
          from: 'USD',
          to: 'BRL',
          quoteSide: 'BUY',
          referenceDate: { year: 2026, month: 10, day: 1 },
        },
        fetchMock,
      ),
    ).resolves.toMatchObject({
      numerator: 53,
      denominator: 10,
      quoteSide: 'BUY',
    });
  });

  it('inverte BRL para moeda estrangeira sem float financeiro persistido', async () => {
    const fetchMock = vi.fn(async () =>
      response([{ cotacaoCompra: 5.30, cotacaoVenda: 5.32, dataHoraCotacao: '2026-10-01 13:04:00.000' }]),
    ) as unknown as typeof fetch;

    const rate = await fetchPtaxExchangeRate(
      {
        from: 'BRL',
        to: 'USD',
        referenceDate: { year: 2026, month: 10, day: 1 },
      },
      fetchMock,
    );

    expect(rate).toMatchObject({ numerator: 25, denominator: 133 });
  });

  it('calcula cruzamento USD para EUR usando cotações do mesmo dia', async () => {
    const fetchMock = vi.fn(async (input) => {
      const currency = new URL(input.toString()).searchParams.get('@moeda');
      return currency === "'USD'"
        ? response([{ cotacaoCompra: 5.30, cotacaoVenda: 5.32, dataHoraCotacao: '2026-10-01 13:04:00.000' }])
        : response([{ cotacaoCompra: 6.36, cotacaoVenda: 6.384, dataHoraCotacao: '2026-10-01 13:04:00.000' }]);
    }) as unknown as typeof fetch;

    const rate = await fetchPtaxExchangeRate(
      {
        from: 'USD',
        to: 'EUR',
        referenceDate: { year: 2026, month: 10, day: 1 },
      },
      fetchMock,
    );

    expect(rate).toMatchObject({ numerator: 5, denominator: 6 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('repete uma única vez em falha transitória', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(
        response([{ cotacaoCompra: 5.30, cotacaoVenda: 5.32, dataHoraCotacao: '2026-10-01 13:04:00.000' }]),
      ) as unknown as typeof fetch;

    await fetchPtaxExchangeRate(
      {
        from: 'USD',
        to: 'BRL',
        referenceDate: { year: 2026, month: 10, day: 1 },
      },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('não repete erro HTTP não transitório', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 400 })) as unknown as typeof fetch;

    await expect(
      fetchPtaxExchangeRate(
        {
          from: 'USD',
          to: 'BRL',
          referenceDate: { year: 2026, month: 10, day: 1 },
        },
        fetchMock,
      ),
    ).rejects.toThrow('HTTP 400');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('BCB PTAX client — erros tipados', () => {
  const input = {
    from: 'USD' as const,
    to: 'BRL' as const,
    referenceDate: { year: 2026, month: 9, day: 28 },
  };

  it('5xx vira UPSTREAM_UNAVAILABLE (503) após no máximo 2 tentativas', async () => {
    const fetchMock = vi.fn(async () => new Response('x', { status: 503 }));
    await expect(
      fetchPtaxExchangeRate(input, fetchMock as unknown as typeof fetch),
    ).rejects.toMatchObject({ kind: 'UPSTREAM_UNAVAILABLE', status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('429 do BCB não é reenviado e expõe Retry-After', async () => {
    const fetchMock = vi.fn(
      async () => new Response('x', { status: 429, headers: { 'retry-after': '30' } }),
    );
    await expect(
      fetchPtaxExchangeRate(input, fetchMock as unknown as typeof fetch),
    ).rejects.toMatchObject({
      kind: 'UPSTREAM_RATE_LIMIT',
      status: 429,
      retryAfterSeconds: 30,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('payload inválido vira 502 e timeout vira 504', async () => {
    const invalid = vi.fn(async () => Response.json({ nope: true }));
    await expect(
      fetchPtaxExchangeRate(input, invalid as unknown as typeof fetch),
    ).rejects.toMatchObject({ kind: 'INVALID_UPSTREAM_PAYLOAD', status: 502 });

    const timeout = vi.fn(async () => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    });
    await expect(
      fetchPtaxExchangeRate(input, timeout as unknown as typeof fetch),
    ).rejects.toMatchObject({ kind: 'UPSTREAM_TIMEOUT', status: 504 });
  });

  it('sem cotação no período vira NO_QUOTE_IN_LOOKBACK (404)', async () => {
    const empty = vi.fn(async () => Response.json({ value: [] }));
    await expect(
      fetchPtaxExchangeRate(input, empty as unknown as typeof fetch),
    ).rejects.toMatchObject({ kind: 'NO_QUOTE_IN_LOOKBACK', status: 404 });
  });
});
