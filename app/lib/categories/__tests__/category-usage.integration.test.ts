import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { categoryCrud } from "@/app/lib/categories/category-crud";
import { prisma } from "@/app/lib/prisma";
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

describe("category transaction usage", () => {
  it("counts and filters a category used only in an allocation", async () => {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: "Category Usage Owner",
        email: `category-usage-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(user.id);
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const [primary, secondary, account] = await Promise.all([
      prisma.category.create({
        data: { name: "Principal", type: "EXPENSE", userId: user.id },
      }),
      prisma.category.create({
        data: { name: "Secundária", type: "EXPENSE", userId: user.id },
      }),
      prisma.account.create({
        data: {
          name: "Conta de uso",
          type: "CREDIT_DEBIT",
          currency: "BRL",
          userId: user.id,
        },
      }),
    ]);

    const transaction = await prisma.transaction.create({
      data: {
        amount: 10_000,
        year: 2031,
        month: 4,
        day: 10,
        type: "EXPENSE",
        description: "Compra dividida",
        status: "COMPLETED",
        accountId: account.id,
        categoryId: primary.id,
        userId: user.id,
        allocations: {
          create: [
            { amount: 6_000, categoryId: primary.id, userId: user.id },
            { amount: 4_000, categoryId: secondary.id, userId: user.id },
          ],
        },
      },
    });

    const categoryResponse = await categoryCrud.getById(
      new Request(`http://localhost/api/categories/${secondary.id}`),
      { params: Promise.resolve({ id: secondary.id }) },
    );
    const categoryBody = await categoryResponse.json();
    expect(categoryBody.data.transactionsCount).toBe(1);

    const listResponse = await transactionCrud.list(
      new Request(
        `http://localhost/api/transactions?categoryId=${encodeURIComponent(secondary.id)}`,
      ),
    );
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.data.items.map((item: { id: string }) => item.id)).toContain(
      transaction.id,
    );
  });
});
