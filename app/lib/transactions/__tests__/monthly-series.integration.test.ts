import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { transactionCrud } from "@/app/lib/crud/transaction.crud";
import { withDerivedAccountBalance } from "@/app/lib/accounts/account-balance";
import {
  createMonthlyRecurringTransactions,
  createMonthlySeriesWithTx,
} from "@/app/lib/transactions/monthly-series";
import { CreateMonthlyRecurringTransactionInput } from "@/app/schemas/transaction-recurrence.schema";

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
        name: "Recurring Owner",
        email: `recurring-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Recurring Other",
        email: `recurring-other-${suffix}@example.com`,
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
        name: `Outra conta ${suffix}`,
        type: "CREDIT_DEBIT",
        userId: otherUser.id,
      },
    }),
  ]);

  const category = await prisma.category.create({
    data: {
      name: `Despesa ${suffix}`.slice(0, 50),
      type: "EXPENSE",
      userId: owner.id,
    },
  });

  const input: CreateMonthlyRecurringTransactionInput = {
    transaction: {
      amount: 5000,
      type: "INCOME",
      description: "Assinatura mensal",
      status: "COMPLETED",
      year: 2027,
      month: 1,
      day: 31,
      accountId: account.id,
      categoryId: category.id,
    },
    recurrence: {
      mode: "count",
      occurrences: 3,
    },
  };

  return { owner, otherUser, account, otherAccount, category, input };
}

describe("monthly transaction series integration", () => {
  it("creates isolated occurrences atomically without anticipating future balance", async () => {
    const { owner, otherUser, account, otherAccount, input } =
      await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await createMonthlyRecurringTransactions(
      new Request("http://localhost/api/transactions/recurring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.occurrenceCount).toBe(3);
    expect(body.data.series).toMatchObject({
      type: "RECURRING",
      frequency: "MONTHLY",
      description: "Assinatura mensal",
      anchorDay: 31,
      occurrenceCount: 3,
      start: { year: 2027, month: 1, day: 31 },
      end: { year: 2027, month: 3, day: 31 },
    });
    expect(body.data.firstOccurrence.account).not.toHaveProperty("userId");
    expect(body.data.firstOccurrence.category).not.toHaveProperty("userId");

    const seriesId = body.data.series.id as string;
    const occurrences = await prisma.transaction.findMany({
      where: { userId: owner.id, seriesId },
      orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }],
    });

    expect(
      occurrences.map(({ year, month, day, status, type, seriesIndex }) => ({
        year,
        month,
        day,
        status,
        type,
        seriesIndex,
      }))
    ).toEqual([
      {
        year: 2027,
        month: 1,
        day: 31,
        status: "COMPLETED",
        type: "EXPENSE",
        seriesIndex: 1,
      },
      {
        year: 2027,
        month: 2,
        day: 28,
        status: "PENDING",
        type: "EXPENSE",
        seriesIndex: 2,
      },
      {
        year: 2027,
        month: 3,
        day: 31,
        status: "PENDING",
        type: "EXPENSE",
        seriesIndex: 3,
      },
    ]);

    const balance = await withDerivedAccountBalance(account, owner.id);
    expect(balance.balance).toBe(-5000);

    const beforeReadCount = await prisma.transaction.count({
      where: { userId: owner.id },
    });
    const listResponse = await transactionCrud.list(
      new Request("http://localhost/api/transactions?year=2027")
    );
    expect(listResponse.status).toBe(200);

    const ownerReadResponse = await transactionCrud.getById(
      new Request(`http://localhost/api/transactions/${occurrences[1].id}`),
      { params: Promise.resolve({ id: occurrences[1].id }) }
    );
    const ownerReadBody = await ownerReadResponse.json();
    expect(ownerReadResponse.status).toBe(200);
    expect(ownerReadBody.data.series.id).toBe(seriesId);
    expect(ownerReadBody.data.series.type).toBe("RECURRING");
    expect(ownerReadBody.data.seriesIndex).toBe(2);
    expect(
      await prisma.transaction.count({ where: { userId: owner.id } })
    ).toBe(beforeReadCount);

    authMocks.getAuthenticatedUserId.mockResolvedValue(otherUser.id);
    const deniedRead = await transactionCrud.getById(
      new Request(`http://localhost/api/transactions/${occurrences[1].id}`),
      { params: Promise.resolve({ id: occurrences[1].id }) }
    );
    expect(deniedRead.status).toBe(404);

    const deniedUpdate = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${occurrences[1].id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "Tentativa externa" }),
      }),
      { params: Promise.resolve({ id: occurrences[1].id }) }
    );
    expect(deniedUpdate.status).toBe(404);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const foreignAccountUpdate = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${occurrences[1].id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: otherAccount.id }),
      }),
      { params: Promise.resolve({ id: occurrences[1].id }) }
    );
    expect(foreignAccountUpdate.status).toBe(400);

    const updateResponse = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${occurrences[1].id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "Ocorrência ajustada" }),
      }),
      { params: Promise.resolve({ id: occurrences[1].id }) }
    );
    expect(updateResponse.status).toBe(200);

    const [editedOccurrence, untouchedOccurrence, series] = await Promise.all([
      prisma.transaction.findUnique({ where: { id: occurrences[1].id } }),
      prisma.transaction.findUnique({ where: { id: occurrences[2].id } }),
      prisma.transactionSeries.findUnique({ where: { id: seriesId } }),
    ]);

    expect(editedOccurrence?.description).toBe("Ocorrência ajustada");
    expect(editedOccurrence?.accountId).toBe(account.id);
    expect(untouchedOccurrence?.description).toBe("Assinatura mensal");
    expect(series?.occurrenceCount).toBe(3);
    expect(series?.type).toBe("RECURRING");
  });

  it("rolls back the whole series when its transaction fails", async () => {
    const { owner, input } = await createFixture();

    await expect(
      prisma.$transaction(async (tx) => {
        await createMonthlySeriesWithTx(tx, owner.id, input);
        throw new Error("forced rollback");
      })
    ).rejects.toThrow("forced rollback");

    const [seriesCount, transactionCount] = await Promise.all([
      prisma.transactionSeries.count({ where: { userId: owner.id } }),
      prisma.transaction.count({ where: { userId: owner.id } }),
    ]);

    expect(seriesCount).toBe(0);
    expect(transactionCount).toBe(0);
  });
});
