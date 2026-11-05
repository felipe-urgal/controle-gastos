import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { UnauthorizedError } from '@/app/lib/auth/auth-errors';
import {
  deleteNetWorthTarget,
  getNetWorthTargets,
  putNetWorthTarget,
} from '@/app/lib/net-worth/net-worth-target';
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
    data: { name: 'Target User', email: 'target-' + randomUUID() + '@example.com', password: 'test-hash' },
  });
  createdUserIds.push(user.id);
  authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
  return user;
}

function json(handler: (request: Request) => Promise<Response>, method: string, body: unknown) {
  return handler(
    new Request('http://localhost/api/net-worth/target', {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('meta de patrimônio', () => {
  it('salva, atualiza e remove uma meta por moeda, sem tocar nas de outro usuário', async () => {
    const owner = await createUser();
    expect((await json(putNetWorthTarget, 'PUT', { currency: 'BRL', amount: 100_000_000 })).status).toBe(200);
    expect((await json(putNetWorthTarget, 'PUT', { currency: 'BRL', amount: 150_000_000 })).status).toBe(200);
    expect((await json(putNetWorthTarget, 'PUT', { currency: 'USD', amount: 5_000_000 })).status).toBe(200);

    const list = await (await getNetWorthTargets()).json();
    expect(list.data).toEqual([
      { currency: 'BRL', amount: 150_000_000 },
      { currency: 'USD', amount: 5_000_000 },
    ]);

    const other = await createUser();
    expect((await (await getNetWorthTargets()).json()).data).toEqual([]);
    expect((await json(deleteNetWorthTarget, 'DELETE', { currency: 'BRL' })).status).toBe(200);
    expect(await prisma.netWorthTarget.count({ where: { userId: owner.id } })).toBe(2);
    expect(other.id).not.toBe(owner.id);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    expect((await json(deleteNetWorthTarget, 'DELETE', { currency: 'BRL' })).status).toBe(200);
    expect(await prisma.netWorthTarget.count({ where: { userId: owner.id } })).toBe(1);
  });

  it('recusa valor inválido (400) e sessão ausente (401)', async () => {
    await createUser();
    expect((await json(putNetWorthTarget, 'PUT', { currency: 'BRL', amount: 0 })).status).toBe(400);
    expect((await json(putNetWorthTarget, 'PUT', { currency: 'BRL', amount: 10.5 })).status).toBe(400);
    expect((await json(putNetWorthTarget, 'PUT', { currency: 'XXX', amount: 100 })).status).toBe(400);

    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());
    expect((await getNetWorthTargets()).status).toBe(401);
    expect((await json(putNetWorthTarget, 'PUT', { currency: 'BRL', amount: 100 })).status).toBe(401);
  });
});
