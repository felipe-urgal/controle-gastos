import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";
import { undoAccountReconciliationForUser } from "@/app/lib/transactions/reconciliation-undo";

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
      name: "Reconciliation Undo",
      email: `reconciliation-undo-${suffix}@example.com`,
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
  const category = await prisma.category.create({
    data: {
      name: `Despesa ${suffix}`.slice(0, 50),
      type: "EXPENSE",
      userId: user.id,
    },
  });

  const olderAt = new Date("2026-08-31T12:00:00.000Z");
  const latestAt = new Date("2026-09-10T12:00:00.000Z");
  const [older, latestA, latestB] = await Promise.all([
    prisma.transaction.create({
      data: {
        amount: 1_000,
        type: "EXPENSE",
        description: "Fechamento anterior",
        status: "COMPLETED",
        reconciliationStatus: "RECONCILED",
        reconciledAt: olderAt,
        year: 2026,
        month: 8,
        day: 31,
        accountId: account.id,
        categoryId: category.id,
        userId: user.id,
      },
    }),
    prisma.transaction.create({
      data: {
        amount: 2_000,
        type: "EXPENSE",
        description: "Fechamento atual A",
        status: "COMPLETED",
        reconciliationStatus: "RECONCILED",
        reconciledAt: latestAt,
        year: 2026,
        month: 9,
        day: 9,
        accountId: account.id,
        categoryId: category.id,
        userId: user.id,
      },
    }),
    prisma.transaction.create({
      data: {
        amount: 3_000,
        type: "EXPENSE",
        description: "Fechamento atual B",
        status: "COMPLETED",
        reconciliationStatus: "RECONCILED",
        reconciledAt: latestAt,
        year: 2026,
        month: 9,
        day: 10,
        accountId: account.id,
        categoryId: category.id,
        userId: user.id,
      },
    }),
  ]);

  await prisma.accountReconciliationEvent.create({
    data: {
      action: "CONFIRMED",
      batchReconciledAt: latestAt,
      transactionCount: 2,
      cutoffYear: 2026,
      cutoffMonth: 9,
      cutoffDay: 10,
      statementBalance: -6_000,
      userId: user.id,
      accountId: account.id,
    },
  });

  return { user, account, older, latestA, latestB, olderAt, latestAt };
}

describe("account reconciliation undo", () => {
  it("returns only the latest batch to CLEARED and records an audit event", async () => {
    const { user, account, older, latestA, latestB, latestAt } = await createFixture();

    const result = await undoAccountReconciliationForUser(user.id, account.id, {
      reconciledAt: latestAt.toISOString(),
    });

    expect(result).toMatchObject({
      restoredCount: 2,
      idempotent: false,
      batchReconciledAt: latestAt.toISOString(),
    });

    const stored = await prisma.transaction.findMany({
      where: { id: { in: [older.id, latestA.id, latestB.id] } },
      select: { id: true, reconciliationStatus: true, reconciledAt: true },
    });
    const byId = new Map(stored.map((item) => [item.id, item]));

    expect(byId.get(older.id)?.reconciliationStatus).toBe("RECONCILED");
    expect(byId.get(latestA.id)).toMatchObject({
      reconciliationStatus: "CLEARED",
      reconciledAt: null,
    });
    expect(byId.get(latestB.id)).toMatchObject({
      reconciliationStatus: "CLEARED",
      reconciledAt: null,
    });

    const audit = await prisma.accountReconciliationEvent.findUnique({
      where: {
        accountId_batchReconciledAt_action: {
          accountId: account.id,
          batchReconciledAt: latestAt,
          action: "UNDONE",
        },
      },
    });
    expect(audit).toMatchObject({
      transactionCount: 2,
      cutoffYear: 2026,
      cutoffMonth: 9,
      cutoffDay: 10,
      statementBalance: -6_000,
    });

    const retry = await undoAccountReconciliationForUser(user.id, account.id, {
      reconciledAt: latestAt.toISOString(),
    });
    expect(retry).toMatchObject({ restoredCount: 0, idempotent: true });
  });

  it("rejects undoing an older batch while a newer reconciliation is active", async () => {
    const { user, account, olderAt } = await createFixture();

    await expect(
      undoAccountReconciliationForUser(user.id, account.id, {
        reconciledAt: olderAt.toISOString(),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("does not expose or mutate another user's account", async () => {
    const { account, latestAt } = await createFixture();
    const otherSuffix = randomUUID();
    const other = await prisma.user.create({
      data: {
        name: "Outro usuário",
        email: `reconciliation-undo-other-${otherSuffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(other.id);

    await expect(
      undoAccountReconciliationForUser(other.id, account.id, {
        reconciledAt: latestAt.toISOString(),
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
