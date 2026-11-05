import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { HttpError } from '@/app/lib/http-error';
import { assertMonthsOpen, MONTH_LOCKED_CODE } from '@/app/lib/monthly-closing/month-lock';
import { prisma } from '@/app/lib/prisma';

const createdUserIds: string[] = [];

afterEach(async () => {
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
      name: 'Month Lock User',
      email: 'month-lock-' + randomUUID() + '@example.com',
      password: 'test-hash',
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe('assertMonthsOpen', () => {
  it('permite quando nenhum mês está travado ou a lista é vazia', async () => {
    const user = await createUser();
    await expect(assertMonthsOpen(prisma, user.id, [])).resolves.toBeUndefined();
    await expect(
      assertMonthsOpen(prisma, user.id, [{ year: 2026, month: 10 }]),
    ).resolves.toBeUndefined();
  });

  it('bloqueia com 409 e código próprio quando algum mês tocado está travado', async () => {
    const user = await createUser();
    await prisma.lockedMonth.create({ data: { userId: user.id, year: 2026, month: 9 } });

    const error = await assertMonthsOpen(prisma, user.id, [
      { year: 2026, month: 10 },
      { year: 2026, month: 9 },
    ]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(409);
    expect((error as HttpError).code).toBe(MONTH_LOCKED_CODE);
    expect((error as HttpError).message).toContain('09/2026');
  });

  it('não é afetado pelo mês travado de outro usuário nem por outro mês', async () => {
    const owner = await createUser();
    const other = await createUser();
    await prisma.lockedMonth.create({ data: { userId: other.id, year: 2026, month: 9 } });
    await prisma.lockedMonth.create({ data: { userId: owner.id, year: 2026, month: 8 } });

    await expect(
      assertMonthsOpen(prisma, owner.id, [{ year: 2026, month: 9 }]),
    ).resolves.toBeUndefined();
  });

  it('o mesmo mês não trava duas vezes', async () => {
    const user = await createUser();
    await prisma.lockedMonth.create({ data: { userId: user.id, year: 2026, month: 9 } });
    await expect(
      prisma.lockedMonth.create({ data: { userId: user.id, year: 2026, month: 9 } }),
    ).rejects.toThrow();
  });
});
