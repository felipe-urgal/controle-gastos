import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import {
  createFlexibleRecurringTransactions,
  createFlexibleSeriesWithTx,
} from "@/app/lib/transactions/flexible-series";
import type { CreateFlexibleRecurringTransactionInput } from "@/app/schemas/transaction-flexible-recurrence.schema";

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
    prisma.user.create({ data: { name: "Flexible Owner", email: `flex-owner-${suffix}@example.com`, password: "test-hash" } }),
    prisma.user.create({ data: { name: "Flexible Other", email: `flex-other-${suffix}@example.com`, password: "test-hash" } }),
  ]);
  createdUserIds.push(owner.id, otherUser.id);

  const [account, foreignAccount] = await Promise.all([
    prisma.account.create({ data: { name: `Conta ${suffix}`, type: "CREDIT_DEBIT", userId: owner.id } }),
    prisma.account.create({ data: { name: `Foreign ${suffix}`, type: "CREDIT_DEBIT", userId: otherUser.id } }),
  ]);
  const category = await prisma.category.create({
    data: { name: `Despesa ${suffix}`.slice(0, 50), type: "EXPENSE", userId: owner.id },
  });

  const input: CreateFlexibleRecurringTransactionInput = {
    transaction: {
      amount: 7_500,
      type: "INCOME",
      description: "Academia quinzenal",
      status: "COMPLETED",
      year: 2027,
      month: 1,
      day: 6,
      accountId: account.id,
      categoryId: category.id,
    },
    recurrence: {
      mode: "count",
      frequency: "WEEKLY",
      interval: 2,
      occurrences: 3,
    },
  };

  return { owner, otherUser, account, foreignAccount, category, input };
}

describe("flexible transaction series integration", () => {
  it("persists the flexible frequency/interval and deterministic occurrences", async () => {
    const { owner, input } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await createFlexibleRecurringTransactions(
      new Request("http://localhost/api/transactions/recurring/flexible", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.series).toMatchObject({
      type: "RECURRING",
      frequency: "WEEKLY",
      interval: 2,
      occurrenceCount: 3,
      start: { year: 2027, month: 1, day: 6 },
      end: { year: 2027, month: 2, day: 3 },
    });

    const occurrences = await prisma.transaction.findMany({
      where: { seriesId: body.data.series.id },
      orderBy: { seriesIndex: "asc" },
    });
    expect(occurrences.map(({ year, month, day, status, type, seriesIndex }) => ({ year, month, day, status, type, seriesIndex }))).toEqual([
      { year: 2027, month: 1, day: 6, status: "COMPLETED", type: "EXPENSE", seriesIndex: 1 },
      { year: 2027, month: 1, day: 20, status: "PENDING", type: "EXPENSE", seriesIndex: 2 },
      { year: 2027, month: 2, day: 3, status: "PENDING", type: "EXPENSE", seriesIndex: 3 },
    ]);
  });

  it("rejects foreign ownership before creating a partial series", async () => {
    const { owner, foreignAccount, input } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await createFlexibleRecurringTransactions(
      new Request("http://localhost/api/transactions/recurring/flexible", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...input,
          transaction: { ...input.transaction, accountId: foreignAccount.id },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await prisma.transactionSeries.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("rolls back the whole flexible series if the transaction aborts", async () => {
    const { owner, input } = await createFixture();

    await expect(
      prisma.$transaction(async (tx) => {
        await createFlexibleSeriesWithTx(tx, owner.id, input);
        throw new Error("forced rollback");
      }),
    ).rejects.toThrow("forced rollback");

    expect(await prisma.transactionSeries.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);
  });
});
