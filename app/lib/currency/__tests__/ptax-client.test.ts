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
