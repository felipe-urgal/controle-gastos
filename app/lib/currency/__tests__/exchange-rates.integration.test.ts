import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

const ptaxMocks = vi.hoisted(() => ({
  fetchPtaxExchangeRate: vi.fn(),
}));

vi.mock('@/app/lib/currency/ptax-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/lib/currency/ptax-client')>()),
  fetchPtaxExchangeRate: ptaxMocks.fetchPtaxExchangeRate,
}));

import { PtaxError } from '@/app/lib/currency/ptax-client';
import { clearRateLimit } from '@/app/lib/security/rate-limit';
import {
  deleteExchangeRate,
  getExchangeRates,
  importPtaxExchangeRate,
  upsertExchangeRate,
} from '@/app/lib/currency/exchange-rates';
import { prisma } from '@/app/lib/prisma';

const createdUserIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  ptaxMocks.fetchPtaxExchangeRate.mockReset();
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser(label: string) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `exchange-rate-${label}-${suffix}@example.com`,
      password: 'test-hash',
    },
  });
  createdUserIds.push(user.id);
  return user;
}

function rateRequest(
  patch: Partial<{
    from: 'BRL' | 'USD' | 'EUR';
    to: 'BRL' | 'USD' | 'EUR';
    numerator: number;
    denominator: number;
    referenceDate: { year: number; month: number; day: number };
  }> = {},
) {
  return new Request('http://localhost/api/exchange-rates', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      from: 'USD',
      to: 'BRL',
      numerator: 532,
      denominator: 100,
      referenceDate: { year: 2026, month: 9, day: 28 },
      ...patch,
    }),
  });
}

describe('manual exchange rate persistence', () => {
  it('upsert é idempotente por usuário/par/origem/data e preserva metadata', async () => {
    const owner = await createUser('owner');
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const firstResponse = await upsertExchangeRate(rateRequest());
    const firstBody = await firstResponse.json();
    expect(firstResponse.status).toBe(200);
    expect(firstBody.data).toMatchObject({
      from: 'USD',
      to: 'BRL',
      numerator: 532,
      denominator: 100,
      source: 'MANUAL',
      quoteSide: 'GENERIC',
      referenceDate: { year: 2026, month: 9, day: 28 },
    });

    const secondResponse = await upsertExchangeRate(
      rateRequest({ numerator: 540 }),
    );
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.data.id).toBe(firstBody.data.id);
    expect(secondBody.data.numerator).toBe(540);
    expect(
      await prisma.exchangeRate.count({ where: { userId: owner.id } }),
    ).toBe(1);
  });

  it('permite PTAX compra e venda no mesmo par/data', async () => {
    const owner = await createUser('ptax-sides');

    await prisma.exchangeRate.createMany({
      data: [
        {
          userId: owner.id,
          fromCurrency: 'USD',
          toCurrency: 'BRL',
          numerator: 530,
          denominator: 100,
          source: 'BCB_PTAX',
          quoteSide: 'BUY',
          referenceYear: 2026,
          referenceMonth: 9,
          referenceDay: 28,
        },
        {
          userId: owner.id,
          fromCurrency: 'USD',
          toCurrency: 'BRL',
          numerator: 532,
          denominator: 100,
          source: 'BCB_PTAX',
          quoteSide: 'SELL',
          referenceYear: 2026,
          referenceMonth: 9,
          referenceDay: 28,
        },
      ],
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await getExchangeRates();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.total).toBe(2);
    expect(body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'BCB_PTAX', quoteSide: 'BUY' }),
        expect.objectContaining({ source: 'BCB_PTAX', quoteSide: 'SELL' }),
      ]),
    );
  });

  it('lista somente taxas do usuário autenticado', async () => {
    const [owner, other] = await Promise.all([
      createUser('list-owner'),
      createUser('list-other'),
    ]);

    await Promise.all([
      prisma.exchangeRate.create({
        data: {
          userId: owner.id,
          fromCurrency: 'USD',
          toCurrency: 'BRL',
          numerator: 532,
          denominator: 100,
          source: 'MANUAL',
          referenceYear: 2026,
          referenceMonth: 9,
          referenceDay: 28,
        },
      }),
      prisma.exchangeRate.create({
        data: {
          userId: other.id,
          fromCurrency: 'EUR',
          toCurrency: 'BRL',
          numerator: 620,
          denominator: 100,
          source: 'MANUAL',
          referenceYear: 2026,
          referenceMonth: 9,
          referenceDay: 28,
        },
      }),
    ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await getExchangeRates();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.total).toBe(1);
    expect(body.data.items[0]).toMatchObject({
      from: 'USD',
      to: 'BRL',
    });
    expect(JSON.stringify(body)).not.toContain('EUR');
  });

  it('pagina e filtra grandes históricos sem misturar pares', async () => {
    const owner = await createUser('paged-owner');
    await prisma.exchangeRate.createMany({
      data: Array.from({ length: 25 }, (_, index) => ({
        userId: owner.id,
        fromCurrency: index < 20 ? 'USD' : 'EUR',
        toCurrency: 'BRL',
        numerator: 500 + index,
        denominator: 100,
        source: 'MANUAL',
        referenceYear: 2026,
        referenceMonth: 9,
        referenceDay: index + 1,
      })),
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await getExchangeRates(
      new Request(
        'http://localhost/api/exchange-rates?page=2&limit=7&from=USD&to=BRL',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      total: 20,
      page: 2,
      limit: 7,
      hasMore: true,
    });
    expect(body.data.items).toHaveLength(7);
    expect(
      body.data.items.every(
        (item: { from: string; to: string }) =>
          item.from === 'USD' && item.to === 'BRL',
      ),
    ).toBe(true);
  });

  it('rejeita mesma moeda e não persiste fallback inválido', async () => {
    const owner = await createUser('invalid-owner');
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await upsertExchangeRate(
      rateRequest({ from: 'BRL', to: 'BRL' }),
    );

    expect(response.status).toBe(400);
    expect(
      await prisma.exchangeRate.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it('não permite excluir taxa de outro usuário', async () => {
    const [owner, other] = await Promise.all([
      createUser('delete-owner'),
      createUser('delete-other'),
    ]);

    const rate = await prisma.exchangeRate.create({
      data: {
        userId: owner.id,
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        numerator: 532,
        denominator: 100,
        source: 'MANUAL',
        referenceYear: 2026,
        referenceMonth: 9,
        referenceDay: 28,
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(other.id);
    const denied = await deleteExchangeRate(
      new Request(`http://localhost/api/exchange-rates/${rate.id}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: rate.id }) },
    );
    expect(denied.status).toBe(404);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const removed = await deleteExchangeRate(
      new Request(`http://localhost/api/exchange-rates/${rate.id}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: rate.id }) },
    );
    expect(removed.status).toBe(200);
    expect(
      await prisma.exchangeRate.findUnique({ where: { id: rate.id } }),
    ).toBeNull();
  });

  it('rejeita taxa manual com referência futura (data lógica UTC)', async () => {
    const owner = await createUser('future-owner');
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const tomorrow = new Date(Date.now() + 36 * 60 * 60 * 1000);

    const response = await upsertExchangeRate(
      rateRequest({
        referenceDate: {
          year: tomorrow.getUTCFullYear(),
          month: tomorrow.getUTCMonth() + 1,
          day: tomorrow.getUTCDate(),
        },
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toMatch(/futura/);
    expect(await prisma.exchangeRate.count({ where: { userId: owner.id } })).toBe(0);
  });

  it('filtra por origem, lado e período', async () => {
    const owner = await createUser('filters-owner');
    const base = { userId: owner.id, fromCurrency: 'USD', toCurrency: 'BRL', numerator: 5, denominator: 1 };
    await prisma.exchangeRate.createMany({
      data: [
        { ...base, source: 'MANUAL', quoteSide: 'GENERIC', referenceYear: 2026, referenceMonth: 9, referenceDay: 1 },
        { ...base, source: 'BCB_PTAX', quoteSide: 'BUY', referenceYear: 2026, referenceMonth: 9, referenceDay: 10 },
        { ...base, source: 'BCB_PTAX', quoteSide: 'SELL', referenceYear: 2026, referenceMonth: 9, referenceDay: 10 },
        { ...base, source: 'BCB_PTAX', quoteSide: 'SELL', referenceYear: 2026, referenceMonth: 10, referenceDay: 2 },
      ],
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const query = async (qs: string) =>
      (await (await getExchangeRates(new Request(`http://localhost/api/exchange-rates?${qs}`))).json()).data;

    expect((await query('source=MANUAL')).total).toBe(1);
    expect((await query('source=BCB_PTAX')).total).toBe(3);
    expect((await query('source=BCB_PTAX&quoteSide=BUY')).total).toBe(1);
    expect((await query('dateFrom=2026-09-05&dateTo=2026-09-30')).total).toBe(2);
    expect((await query('dateFrom=2026-10-01')).total).toBe(1);

    const invalid = await getExchangeRates(
      new Request('http://localhost/api/exchange-rates?source=OUTRA'),
    );
    expect(invalid.status).toBe(400);
  });
});

describe('PTAX endpoint', () => {
  const ptaxRequest = () =>
    new Request('http://localhost/api/exchange-rates/ptax', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'USD',
        to: 'BRL',
        quoteSide: 'SELL',
        referenceDate: { year: 2026, month: 9, day: 28 },
      }),
    });

  it('mapeia falhas do BCB para status semânticos (não 400)', async () => {
    const owner = await createUser('ptax-errors');
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const cases: Array<[PtaxError, number]> = [
      [new PtaxError('UPSTREAM_TIMEOUT', 'timeout'), 504],
      [new PtaxError('UPSTREAM_UNAVAILABLE', 'fora'), 503],
      [new PtaxError('INVALID_UPSTREAM_PAYLOAD', 'payload'), 502],
      [new PtaxError('NO_QUOTE_IN_LOOKBACK', 'sem cotação'), 404],
      [new PtaxError('UPSTREAM_RATE_LIMIT', 'limite', 45), 429],
    ];

    for (const [error, status] of cases) {
      ptaxMocks.fetchPtaxExchangeRate.mockRejectedValueOnce(error);
      const response = await importPtaxExchangeRate(ptaxRequest());
      expect(response.status).toBe(status);
      expect((await response.json()).error.code).toBe(error.kind);
      if (status === 429) {
        expect(response.headers.get('Retry-After')).toBe('45');
      }
    }
    expect(await prisma.exchangeRate.count({ where: { userId: owner.id } })).toBe(0);
  });

  it('aplica rate limit dedicado com Retry-After sem chamar o BCB', async () => {
    const owner = await createUser('ptax-limit');
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    ptaxMocks.fetchPtaxExchangeRate.mockRejectedValue(
      new PtaxError('NO_QUOTE_IN_LOOKBACK', 'sem cotação'),
    );

    try {
      for (let i = 0; i < 30; i += 1) {
        expect((await importPtaxExchangeRate(ptaxRequest())).status).toBe(404);
      }
      const limited = await importPtaxExchangeRate(ptaxRequest());
      expect(limited.status).toBe(429);
      expect(limited.headers.get('Retry-After')).toBeTruthy();
      expect(ptaxMocks.fetchPtaxExchangeRate).toHaveBeenCalledTimes(30);
    } finally {
      await clearRateLimit('exchange-rate-ptax-user', owner.id);
    }
  });

  it('rejeita data futura antes de consultar o BCB', async () => {
    const owner = await createUser('ptax-future');
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await importPtaxExchangeRate(
      new Request('http://localhost/api/exchange-rates/ptax', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          from: 'USD',
          to: 'BRL',
          referenceDate: { year: 2100, month: 1, day: 1 },
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(ptaxMocks.fetchPtaxExchangeRate).not.toHaveBeenCalled();
  });
});
