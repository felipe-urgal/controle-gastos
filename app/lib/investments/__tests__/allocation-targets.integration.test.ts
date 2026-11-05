import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { UnauthorizedError } from '@/app/lib/auth/auth-errors';
import { getAllocationTargets, putAllocationTargets } from '@/app/lib/investments/allocation-targets';
import { prisma } from '@/app/lib/prisma';

const createdUserIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser() {
  const user = await prisma.user.create({
    data: { name: 'Allocation User', email: 'allocation-' + randomUUID() + '@example.com', password: 'test-hash' },
  });
  createdUserIds.push(user.id);
  authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
  return user;
}

function put(body: unknown) {
  return putAllocationTargets(
    new Request('http://localhost/api/investments/allocation-targets', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('alocação alvo da carteira', () => {
  it('substitui o conjunto da moeda, mantém as outras moedas e outros usuários, e limpa com lista vazia', async () => {
    const owner = await createUser();
    expect((await put({ currency: 'BRL', targets: [{ assetType: 'STOCK', percent: 60 }, { assetType: 'FII', percent: 40 }] })).status).toBe(200);
    expect((await put({ currency: 'USD', targets: [{ assetType: 'ETF', percent: 100 }] })).status).toBe(200);
    // Substitui o conjunto de BRL por inteiro.
    expect((await put({ currency: 'BRL', targets: [{ assetType: 'FIXED_INCOME', percent: 70 }, { assetType: 'STOCK', percent: 30 }] })).status).toBe(200);

    const list = (await (await getAllocationTargets()).json()).data;
    expect(list).toEqual([
      { currency: 'BRL', assetType: 'FIXED_INCOME', percent: 70 },
      { currency: 'BRL', assetType: 'STOCK', percent: 30 },
      { currency: 'USD', assetType: 'ETF', percent: 100 },
    ]);

    await createUser();
    expect((await (await getAllocationTargets()).json()).data).toEqual([]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    expect((await put({ currency: 'BRL', targets: [] })).status).toBe(200);
    expect(await prisma.investmentAllocationTarget.count({ where: { userId: owner.id, currency: 'BRL' } })).toBe(0);
    expect(await prisma.investmentAllocationTarget.count({ where: { userId: owner.id, currency: 'USD' } })).toBe(1);
  });

  it('recusa soma diferente de 100, percentual inválido e classe repetida sem alterar nada', async () => {
    const owner = await createUser();
    await put({ currency: 'BRL', targets: [{ assetType: 'STOCK', percent: 100 }] });

    expect((await put({ currency: 'BRL', targets: [{ assetType: 'STOCK', percent: 60 }, { assetType: 'FII', percent: 30 }] })).status).toBe(400);
    expect((await put({ currency: 'BRL', targets: [{ assetType: 'STOCK', percent: 0 }, { assetType: 'FII', percent: 100 }] })).status).toBe(400);
    expect((await put({ currency: 'BRL', targets: [{ assetType: 'STOCK', percent: 50 }, { assetType: 'STOCK', percent: 50 }] })).status).toBe(400);
    expect((await put({ currency: 'BRL', targets: [{ assetType: 'BONDS', percent: 100 }] })).status).toBe(400);
    expect((await put({ currency: 'XXX', targets: [] })).status).toBe(400);

    const rows = await prisma.investmentAllocationTarget.findMany({ where: { userId: owner.id } });
    expect(rows.map((row) => [row.assetType, row.percent])).toEqual([['STOCK', 100]]);
  });

  it('exige sessão', async () => {
    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());
    expect((await getAllocationTargets()).status).toBe(401);
    expect((await put({ currency: 'BRL', targets: [] })).status).toBe(401);
  });
});
