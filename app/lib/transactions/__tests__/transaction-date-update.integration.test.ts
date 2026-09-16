import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { transactionCrud } from "@/app/lib/transactions/transaction-crud";

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

describe("transaction logical date updates", () => {
  it("rejects a partial date update that would make the persisted date impossible", async () => {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: "Date Owner",
        email: `transaction-date-${suffix}@example.com`,
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
        name: `Categoria ${suffix}`,
        type: "EXPENSE",
        userId: user.id,
      },
    });
    const transaction = await prisma.transaction.create({
      data: {
        amount: 1_000,
        type: "EXPENSE",
        description: "Fechamento mensal",
        status: "COMPLETED",
        year: 2026,
        month: 1,
        day: 31,
        accountId: account.id,
        categoryId: category.id,
        userId: user.id,
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const invalidResponse = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month: 2 }),
      }),
      { params: Promise.resolve({ id: transaction.id }) },
    );

    expect(invalidResponse.status).toBe(400);
    expect(
      await prisma.transaction.findUnique({ where: { id: transaction.id } }),
    ).toMatchObject({ year: 2026, month: 1, day: 31 });

    const validResponse = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ year: 2028, month: 2, day: 29 }),
      }),
      { params: Promise.resolve({ id: transaction.id }) },
    );

    expect(validResponse.status).toBe(200);
    expect(
      await prisma.transaction.findUnique({ where: { id: transaction.id } }),
    ).toMatchObject({ year: 2028, month: 2, day: 29 });
  });
});
