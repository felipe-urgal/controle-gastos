import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { getMonthlyClosingForUser } from '@/app/lib/monthly-closing/monthly-closing';
import { lockMonth, unlockMonth } from '@/app/lib/monthly-closing/month-lock-api';
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
    data: {
      name: 'Month Lock Api',
      email: 'month-lock-api-' + randomUUID() + '@example.com',
      password: 'test-hash',
    },
  });
  createdUserIds.push(user.id);
  authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
  return user;
}

function call(handler: (request: Request) => Promise<Response>, method: string, body: unknown) {
  return handler(
    new Request('http://localhost/api/monthly-closing/lock', {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('API de travar e reabrir o mês', () => {
  it('trava, repete sem erro e reabre', async () => {
    const user = await createUser();

    const first = await call(lockMonth, 'POST', { year: 2026, month: 9 });
    expect(first.status).toBe(200);
    expect((await first.json()).data).toMatchObject({ locked: true });

    expect((await call(lockMonth, 'POST', { year: 2026, month: 9 })).status).toBe(200);
    expect(await prisma.lockedMonth.count({ where: { userId: user.id } })).toBe(1);

    const closing = await getMonthlyClosingForUser(user.id, { year: 2026, month: 9 }, 'BRL');
    expect(closing.lock.locked).toBe(true);

    const reopened = await call(unlockMonth, 'DELETE', { year: 2026, month: 9 });
    expect(reopened.status).toBe(200);
    expect((await reopened.json()).data).toEqual({ locked: false, lockedAt: null });
    expect((await call(unlockMonth, 'DELETE', { year: 2026, month: 9 })).status).toBe(200);
    expect(await prisma.lockedMonth.count({ where: { userId: user.id } })).toBe(0);
  });

  it('recusa mês futuro e período inválido com 400', async () => {
    const user = await createUser();

    expect((await call(lockMonth, 'POST', { year: 2100, month: 1 })).status).toBe(400);
    expect((await call(lockMonth, 'POST', { year: 2026, month: 13 })).status).toBe(400);
    expect((await call(unlockMonth, 'DELETE', { year: 'x', month: 1 })).status).toBe(400);
    expect(await prisma.lockedMonth.count({ where: { userId: user.id } })).toBe(0);
  });

  it('sem sessão devolve 401 e não grava', async () => {
    const { UnauthorizedError } = await import('@/app/lib/auth/auth-errors');
    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());

    expect((await call(lockMonth, 'POST', { year: 2026, month: 9 })).status).toBe(401);
    expect((await call(unlockMonth, 'DELETE', { year: 2026, month: 9 })).status).toBe(401);
  });

  it('só mexe no mês do usuário autenticado', async () => {
    const owner = await createUser();
    await prisma.lockedMonth.create({ data: { userId: owner.id, year: 2026, month: 9 } });

    const other = await createUser();
    expect((await call(unlockMonth, 'DELETE', { year: 2026, month: 9 })).status).toBe(200);
    expect(other.id).not.toBe(owner.id);
    expect(await prisma.lockedMonth.count({ where: { userId: owner.id } })).toBe(1);

    const closing = await getMonthlyClosingForUser(other.id, { year: 2026, month: 9 }, 'BRL');
    expect(closing.lock.locked).toBe(false);
  });
});
