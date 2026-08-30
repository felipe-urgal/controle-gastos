import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { withDerivedAccountBalance } from "@/app/lib/accounts/account-balance";
import {
  createInstallmentSeriesWithTx,
  createInstallmentTransactions,
} from "@/app/lib/transactions/installment-series";
import { CreateInstallmentTransactionInput } from "@/app/schemas/transaction-installment.schema";

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

async function createFixture() {
  const suffix = randomUUID();
  const [owner, otherUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Installment Owner",
        email: `installment-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Installment Other",
        email: `installment-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  createdUserIds.push(owner.id, otherUser.id);

  const [account, otherAccount] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Conta ${suffix}`,
        type: "CREDIT_DEBIT",
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Conta externa ${suffix}`,
        type: "CREDIT_DEBIT",
        userId: otherUser.id,
      },
    }),
  ]);

  const [expenseCategory, incomeCategory] = await Promise.all([
    prisma.category.create({
      data: {
        name: `Despesa ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: owner.id,
      },
    }),
    prisma.category.create({
      data: {
        name: `Receita ${suffix}`.slice(0, 50),
        type: "INCOME",
        userId: owner.id,
      },
    }),
  ]);

  const input: CreateInstallmentTransactionInput = {
    transaction: {
      amount: 10_001,
      type: "EXPENSE",
      description: "Notebook",
      status: "COMPLETED",
      year: 2028,
      month: 1,
      day: 31,
      accountId: account.id,
      categoryId: expenseCategory.id,
    },
    installmentCount: 3,
  };

  return {
    owner,
    otherUser,
    account,
    otherAccount,
    expenseCategory,
    incomeCategory,
    input,
  };
}

describe("installment transaction series integration", () => {
  it("creates exact isolated installments atomically without anticipating future balance", async () => {
    const { owner, account, input } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await createInstallmentTransactions(
      new Request("http://localhost/api/transactions/installments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.series).toMatchObject({
      type: "INSTALLMENT",
      frequency: "MONTHLY",
      description: "Notebook",
      occurrenceCount: 3,
      start: { year: 2028, month: 1, day: 31 },
      end: { year: 2028, month: 3, day: 31 },
    });

    const occurrences = await prisma.transaction.findMany({
      where: { seriesId: body.data.series.id, userId: owner.id },
      orderBy: { seriesIndex: "asc" },
    });

    expect(
      occurrences.map(({ amount, day, month, status, seriesIndex, description }) => ({
        amount,
        day,
        month,
        status,
        seriesIndex,
        description,
      }))
    ).toEqual([
      {
        amount: 3_334,
        day: 31,
        month: 1,
        status: "COMPLETED",
        seriesIndex: 1,
        description: "Notebook 1/3",
      },
      {
        amount: 3_334,
        day: 29,
        month: 2,
        status: "PENDING",
        seriesIndex: 2,
        description: "Notebook 2/3",
      },
      {
        amount: 3_333,
        day: 31,
        month: 3,
        status: "PENDING",
        seriesIndex: 3,
        description: "Notebook 3/3",
      },
    ]);
    expect(occurrences.reduce((total, item) => total + item.amount, 0)).toBe(10_001);

    const balance = await withDerivedAccountBalance(account, owner.id);
    expect(balance.balance).toBe(-3_334);
  });

  it("rejects income categories and resources owned by another user", async () => {
    const { owner, incomeCategory, otherAccount, input } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const incomeResponse = await createInstallmentTransactions(
      new Request("http://localhost/api/transactions/installments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...input,
          transaction: { ...input.transaction, categoryId: incomeCategory.id },
        }),
      })
    );
    expect(incomeResponse.status).toBe(400);

    const foreignAccountResponse = await createInstallmentTransactions(
      new Request("http://localhost/api/transactions/installments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...input,
          transaction: { ...input.transaction, accountId: otherAccount.id },
        }),
      })
    );
    expect(foreignAccountResponse.status).toBe(400);

    expect(await prisma.transactionSeries.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("rolls back series and installments together", async () => {
    const { owner, input } = await createFixture();

    await expect(
      prisma.$transaction(async (tx) => {
        await createInstallmentSeriesWithTx(tx, owner.id, input);
        throw new Error("forced rollback");
      })
    ).rejects.toThrow("forced rollback");

    expect(await prisma.transactionSeries.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);
  });
});
