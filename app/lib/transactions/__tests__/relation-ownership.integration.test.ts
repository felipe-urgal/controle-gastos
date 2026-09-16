import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { createFlexibleRecurringTransactions } from "@/app/lib/transactions/flexible-series";
import { createInstallmentTransactions } from "@/app/lib/transactions/installment-series";
import { createMonthlyRecurringTransactions } from "@/app/lib/transactions/monthly-series";
import { transactionCrud } from "@/app/lib/transactions/transaction-crud";

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

async function createFixture() {
  const suffix = randomUUID();
  const [owner, otherUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Relation Owner",
        email: `relation-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Relation Other",
        email: `relation-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  createdUserIds.push(owner.id, otherUser.id);

  const [account, foreignAccount] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Conta ${suffix}`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Conta externa ${suffix}`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: otherUser.id,
      },
    }),
  ]);

  const [category, foreignCategory] = await Promise.all([
    prisma.category.create({
      data: {
        name: `Despesa ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: owner.id,
      },
    }),
    prisma.category.create({
      data: {
        name: `Despesa externa ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: otherUser.id,
      },
    }),
  ]);

  return { owner, otherUser, account, foreignAccount, category, foreignCategory };
}

function normalPayload(accountId: string, categoryId: string) {
  return {
    amount: 12_345,
    type: "EXPENSE",
    description: "Compra isolada",
    status: "PENDING",
    year: 2031,
    month: 4,
    day: 15,
    accountId,
    categoryId,
  };
}

function request(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("transaction relation ownership", () => {
  it("rejects foreign account/category on normal create and update without changing owned data", async () => {
    const { owner, account, foreignAccount, category, foreignCategory } =
      await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const foreignAccountCreate = await transactionCrud.create(
      request(
        "http://localhost/api/transactions",
        normalPayload(foreignAccount.id, category.id),
      ),
    );
    const foreignCategoryCreate = await transactionCrud.create(
      request(
        "http://localhost/api/transactions",
        normalPayload(account.id, foreignCategory.id),
      ),
    );

    expect(foreignAccountCreate.status).toBe(400);
    expect(foreignCategoryCreate.status).toBe(400);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);

    const owned = await prisma.transaction.create({
      data: {
        ...normalPayload(account.id, category.id),
        userId: owner.id,
      },
    });

    const foreignAccountUpdate = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${owned.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: foreignAccount.id }),
      }),
      { params: Promise.resolve({ id: owned.id }) },
    );
    const foreignCategoryUpdate = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${owned.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: foreignCategory.id }),
      }),
      { params: Promise.resolve({ id: owned.id }) },
    );

    expect(foreignAccountUpdate.status).toBe(400);
    expect(foreignCategoryUpdate.status).toBe(400);
    expect(await prisma.transaction.findUnique({ where: { id: owned.id } })).toMatchObject({
      accountId: account.id,
      categoryId: category.id,
      userId: owner.id,
      amount: 12_345,
      status: "PENDING",
    });
  });

  it("rejects foreign categories in monthly, flexible and installment series without partial writes", async () => {
    const { owner, account, foreignCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const transaction = {
      amount: 9_000,
      type: "EXPENSE" as const,
      description: "Série isolada",
      status: "COMPLETED" as const,
      year: 2031,
      month: 1,
      day: 31,
      accountId: account.id,
      categoryId: foreignCategory.id,
    };

    const monthly = await createMonthlyRecurringTransactions(
      request("http://localhost/api/transactions/recurring", {
        transaction,
        recurrence: { mode: "count", occurrences: 3 },
      }),
    );
    const flexible = await createFlexibleRecurringTransactions(
      request("http://localhost/api/transactions/recurring/flexible", {
        transaction,
        recurrence: {
          mode: "count",
          frequency: "WEEKLY",
          interval: 2,
          occurrences: 3,
        },
      }),
    );
    const installments = await createInstallmentTransactions(
      request("http://localhost/api/transactions/installments", {
        transaction,
        installmentCount: 3,
      }),
    );

    expect(monthly.status).toBe(400);
    expect(flexible.status).toBe(400);
    expect(installments.status).toBe(400);
    expect(await prisma.transactionSeries.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);
  });
});
