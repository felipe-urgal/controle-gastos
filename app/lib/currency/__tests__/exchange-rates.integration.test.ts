import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  deleteExchangeRate,
  getExchangeRates,
  upsertExchangeRate,
} from '@/app/lib/currency/exchange-rates';
import { prisma } from '@/app/lib/prisma';

const createdUserIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
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
});
