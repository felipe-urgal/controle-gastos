import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { UnauthorizedError } from '@/app/lib/auth/auth-errors';
import { exportAccountStatement } from '@/app/lib/accounts/account-statement';
import { prisma } from '@/app/lib/prisma';
import { FinancialTestFactory } from '@/tests/support/financial-test-factory';

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function setup() {
  const owner = await fixtures.user({ name: 'Statement Owner' });
  const account = await fixtures.account(owner.id, { name: 'Conta Extrato', currency: 'BRL' });
  const income = await fixtures.category(owner.id, { name: 'Renda extrato', type: 'INCOME' });
  const expense = await fixtures.category(owner.id, { name: 'Gasto extrato', type: 'EXPENSE' });
  const add = (categoryId: string, type: 'INCOME' | 'EXPENSE', amount: number, month: number, day: number, status: 'COMPLETED' | 'PENDING' | 'CANCELLED' = 'COMPLETED', description = 'Item') =>
    prisma.transaction.create({
      data: { userId: owner.id, accountId: account.id, categoryId, type, amount, status, description, year: 2028, month, day },
    });
  authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
  return { owner, account, income, expense, add };
}

function call(accountId: string, query: string) {
  return exportAccountStatement(new Request(`http://localhost/api/accounts/${accountId}/statement?${query}`), {
    params: Promise.resolve({ id: accountId }),
  });
}

describe('extrato da conta em CSV', () => {
  it('calcula o saldo inicial do que veio antes e só lista os concluídos do período', async () => {
    const { account, income, expense, add } = await setup();
    await add(income.id, 'INCOME', 100_000, 3, 10); // antes do período
    await add(expense.id, 'EXPENSE', 20_000, 3, 20); // antes do período
    await add(income.id, 'INCOME', 50_000, 4, 5, 'COMPLETED', 'Salário');
    await add(expense.id, 'EXPENSE', 10_000, 4, 8, 'COMPLETED', 'Mercado');
    await add(expense.id, 'EXPENSE', 99_999, 4, 9, 'PENDING', 'Pendente');
    await add(expense.id, 'EXPENSE', 88_888, 4, 10, 'CANCELLED', 'Cancelada');
    await add(expense.id, 'EXPENSE', 7_000, 5, 2, 'COMPLETED', 'Depois');

    const response = await call(account.id, 'from=2028-04-01&to=2028-04-30');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('extrato-conta-extrato-2028-04-01-a-2028-04-30.csv');

    const lines = (await response.text()).replace('﻿', '').trim().split('\r\n');
    expect(lines).toEqual([
      '"data","descricao","categoria","valor","saldo"',
      '"2028-04-01","Saldo inicial","",,800.00',
      '"2028-04-05","Salário","Renda extrato",500.00,1300.00',
      '"2028-04-08","Mercado","Gasto extrato",-100.00,1200.00',
      '"2028-04-30","Saldo final","",,1200.00',
    ]);
  });

  it('valida período, dono e tipo de conta', async () => {
    const { owner, account } = await setup();
    const card = await fixtures.account(owner.id, {
      name: 'Cartão extrato',
      type: 'CREDIT_CARD',
      currency: 'BRL',
      creditLimit: 100_000,
      statementClosingDay: 5,
      statementDueDay: 15,
    });
    const stranger = await fixtures.user({ name: 'Statement Stranger' });
    const foreign = await fixtures.account(stranger.id, { name: 'Alheia', currency: 'BRL' });

    expect((await call(account.id, 'from=2028-04-30&to=2028-04-01')).status).toBe(400);
    expect((await call(account.id, 'from=2028-04-01')).status).toBe(400);
    expect((await call(account.id, 'from=2020-01-01&to=2028-04-01')).status).toBe(400);
    expect((await call(card.id, 'from=2028-04-01&to=2028-04-30')).status).toBe(400);
    expect((await call(foreign.id, 'from=2028-04-01&to=2028-04-30')).status).toBe(404);

    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());
    expect((await call(account.id, 'from=2028-04-01&to=2028-04-30')).status).toBe(401);
  });
});
