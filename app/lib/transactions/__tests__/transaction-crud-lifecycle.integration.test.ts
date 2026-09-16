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

describe("normal transaction CRUD lifecycle", () => {
  it("creates, updates and deletes a normal owned transaction", async () => {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: "Transaction CRUD Owner",
        email: `transaction-crud-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(user.id);

    const [account, category] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Conta ${suffix}`,
          type: "CREDIT_DEBIT",
          currency: "BRL",
          userId: user.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Despesa ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: user.id,
        },
      }),
    ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const createResponse = await transactionCrud.create(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: 12_345,
          type: "INCOME",
          description: "Compra planejada",
          status: "PENDING",
          year: 2030,
          month: 6,
          day: 15,
          accountId: account.id,
          categoryId: category.id,
        }),
      }),
    );

    expect(createResponse.status).toBe(201);

    const created = await prisma.transaction.findFirst({
      where: { userId: user.id, description: "Compra planejada" },
    });
    expect(created).toMatchObject({
      amount: 12_345,
      description: "Compra planejada",
      status: "PENDING",
      type: "EXPENSE",
      kind: "NORMAL",
      accountId: account.id,
      categoryId: category.id,
      userId: user.id,
    });

    const transactionId = created!.id;
    const updateResponse = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${transactionId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: 10_000,
          description: "Compra ajustada",
          status: "COMPLETED",
        }),
      }),
      { params: Promise.resolve({ id: transactionId }) },
    );

    expect(updateResponse.status).toBe(200);
    expect(
      await prisma.transaction.findUnique({ where: { id: transactionId } }),
    ).toMatchObject({
      amount: 10_000,
      description: "Compra ajustada",
      status: "COMPLETED",
      type: "EXPENSE",
      accountId: account.id,
      categoryId: category.id,
      userId: user.id,
    });

    const deleteResponse = await transactionCrud.remove(
      new Request(`http://localhost/api/transactions/${transactionId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: transactionId }) },
    );

    expect(deleteResponse.status).toBe(200);
    expect(
      await prisma.transaction.findUnique({ where: { id: transactionId } }),
    ).toBeNull();
  });
});
