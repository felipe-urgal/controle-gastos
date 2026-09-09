import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";
import { confirmAccountReconciliationForUser } from "@/app/lib/transactions/reconciliation-confirm";

const createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createFixture() {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: "Reconciliation Confirm",
      email: `reconciliation-confirm-${suffix}@example.com`,
      password: "test-hash",
    },
  });
  createdUserIds.push(user.id);

  const account = await prisma.account.create({
    data: {
      name: `Conta ${suffix}`,
      type: "CREDIT_DEBIT",
      currency: "BRL",
      userId: user.id,
    },
  });
  const [incomeCategory, expenseCategory] = await Promise.all([
    prisma.category.create({
      data: { name: `Receita ${suffix}`.slice(0, 50), type: "INCOME", userId: user.id },
    }),
    prisma.category.create({
      data: { name: `Despesa ${suffix}`.slice(0, 50), type: "EXPENSE", userId: user.id },
    }),
  ]);

  const [previouslyReconciled, cleared, uncleared] = await Promise.all([
    prisma.transaction.create({
      data: {
        amount: 10_000,
        type: "INCOME",
        description: "Saldo anterior",
        status: "COMPLETED",
        reconciliationStatus: "RECONCILED",
        reconciledAt: new Date("2026-08-31T12:00:00.000Z"),
        year: 2026,
        month: 8,
        day: 31,
        accountId: account.id,
        categoryId: incomeCategory.id,
        userId: user.id,
      },
    }),
    prisma.transaction.create({
      data: {
        amount: 2_500,
        type: "EXPENSE",
        description: "Compra conferida",
        status: "COMPLETED",
        reconciliationStatus: "CLEARED",
        year: 2026,
        month: 9,
        day: 8,
        accountId: account.id,
        categoryId: expenseCategory.id,
        userId: user.id,
      },
    }),
    prisma.transaction.create({
      data: {
        amount: 1_000,
        type: "EXPENSE",
        description: "Compra ainda não conferida",
        status: "COMPLETED",
        year: 2026,
        month: 9,
        day: 9,
        accountId: account.id,
        categoryId: expenseCategory.id,
        userId: user.id,
      },
    }),
  ]);

  return { user, account, previouslyReconciled, cleared, uncleared };
}

const input = {
  year: 2026,
  month: 9,
  day: 9,
  statementBalance: 7_500,
};

describe("account reconciliation confirmation", () => {
  it("promotes only cleared transactions when the difference is exactly zero", async () => {
    const { user, account, previouslyReconciled, cleared, uncleared } = await createFixture();

    const result = await confirmAccountReconciliationForUser(user.id, account.id, input);

    expect(result).toMatchObject({
      statementBalance: 7_500,
      clearedBalance: 7_500,
      difference: 0,
      reconciledCount: 1,
    });
    expect(result.reconciledAt).toEqual(expect.any(String));

    const stored = await prisma.transaction.findMany({
      where: { id: { in: [previouslyReconciled.id, cleared.id, uncleared.id] } },
      select: { id: true, reconciliationStatus: true, reconciledAt: true },
    });
    const byId = new Map(stored.map((item) => [item.id, item]));

    expect(byId.get(previouslyReconciled.id)?.reconciliationStatus).toBe("RECONCILED");
    expect(byId.get(cleared.id)?.reconciliationStatus).toBe("RECONCILED");
    expect(byId.get(cleared.id)?.reconciledAt).not.toBeNull();
    expect(byId.get(uncleared.id)).toMatchObject({
      reconciliationStatus: "UNCLEARED",
      reconciledAt: null,
    });

    const retry = await confirmAccountReconciliationForUser(user.id, account.id, input);
    expect(retry.reconciledCount).toBe(0);
    expect(retry.difference).toBe(0);
  });

  it("rejects a non-zero difference without changing reconciliation state", async () => {
    const { user, account, cleared } = await createFixture();

    await expect(
      confirmAccountReconciliationForUser(user.id, account.id, {
        ...input,
        statementBalance: 7_499,
      }),
    ).rejects.toMatchObject({ status: 409 });

    expect(
      await prisma.transaction.findUnique({
        where: { id: cleared.id },
        select: { reconciliationStatus: true, reconciledAt: true },
      }),
    ).toEqual({ reconciliationStatus: "CLEARED", reconciledAt: null });
  });
});
