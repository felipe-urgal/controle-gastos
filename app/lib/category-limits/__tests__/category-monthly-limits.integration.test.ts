import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  getCategoryMonthlyLimits,
  removeCategoryMonthlyLimit,
  upsertCategoryMonthlyLimit,
} from "@/app/lib/category-limits/category-monthly-limits";
import { prisma } from "@/app/lib/prisma";

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
        name: "Limit Owner",
        email: `limit-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Limit Other",
        email: `limit-other-${suffix}@example.com`,
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

  const [expenseCategory, incomeCategory, foreignExpenseCategory] = await Promise.all([
    prisma.category.create({
      data: {
        name: `Mercado ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: owner.id,
      },
    }),
    prisma.category.create({
      data: {
        name: `Salário ${suffix}`.slice(0, 50),
        type: "INCOME",
        userId: owner.id,
      },
    }),
    prisma.category.create({
      data: {
        name: `Externa ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: otherUser.id,
      },
    }),
  ]);

  return {
    owner,
    otherUser,
    account,
    otherAccount,
    expenseCategory,
    incomeCategory,
    foreignExpenseCategory,
  };
}

function limitRequest(
  method: "GET" | "PUT" | "DELETE",
  input: {
    categoryId?: string;
    year: number;
    month: number;
    amount?: number;
  },
) {
  const url = new URL("http://localhost/api/category-limits");
  url.searchParams.set("year", String(input.year));
  url.searchParams.set("month", String(input.month));
  if (input.categoryId) url.searchParams.set("categoryId", input.categoryId);

  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body:
      method === "PUT"
        ? JSON.stringify({
            categoryId: input.categoryId,
            year: input.year,
            month: input.month,
            amount: input.amount,
          })
        : undefined,
  });
}

describe("category monthly limits integration", () => {
  it("derives realized only from completed expenses in the selected month", async () => {
    const { owner, account, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await prisma.transaction.createMany({
      data: [
        {
          amount: 4_000,
          year: 2028,
          month: 4,
          day: 2,
          type: "EXPENSE",
          description: "Realizado",
          status: "COMPLETED",
          accountId: account.id,
          categoryId: expenseCategory.id,
          userId: owner.id,
        },
        {
          amount: 2_000,
          year: 2028,
          month: 4,
          day: 8,
          type: "EXPENSE",
          description: "Pendente",
          status: "PENDING",
          accountId: account.id,
          categoryId: expenseCategory.id,
          userId: owner.id,
        },
        {
          amount: 1_000,
          year: 2028,
          month: 4,
          day: 9,
          type: "EXPENSE",
          description: "Cancelada",
          status: "CANCELLED",
          accountId: account.id,
          categoryId: expenseCategory.id,
          userId: owner.id,
        },
        {
          amount: 900,
          year: 2028,
          month: 3,
          day: 31,
          type: "EXPENSE",
          description: "Outro mês",
          status: "COMPLETED",
          accountId: account.id,
          categoryId: expenseCategory.id,
          userId: owner.id,
        },
      ],
    });

    const saveResponse = await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 4,
        amount: 10_000,
      }),
    );
    expect(saveResponse.status).toBe(200);

    const response = await getCategoryMonthlyLimits(
      limitRequest("GET", { year: 2028, month: 4 }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]).toMatchObject({
      category: { id: expenseCategory.id },
      limit: { amount: 10_000 },
      realized: 4_000,
      remaining: 6_000,
      percentage: 40,
    });
  });

  it("keeps one limit per user/category/month and independent periods", async () => {
    const { owner, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 12,
        amount: 8_000,
      }),
    );
    await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 12,
        amount: 9_000,
      }),
    );
    await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2029,
        month: 1,
        amount: 11_000,
      }),
    );

    const limits = await prisma.categoryMonthlyLimit.findMany({
      where: { userId: owner.id, categoryId: expenseCategory.id },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    expect(limits).toHaveLength(2);
    expect(limits.map(({ year, month, amount }) => ({ year, month, amount }))).toEqual([
      { year: 2028, month: 12, amount: 9_000 },
      { year: 2029, month: 1, amount: 11_000 },
    ]);

    await expect(
      prisma.categoryMonthlyLimit.create({
        data: {
          userId: owner.id,
          categoryId: expenseCategory.id,
          year: 2028,
          month: 12,
          amount: 1,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects income and foreign categories and isolates reads", async () => {
    const { owner, otherUser, expenseCategory, incomeCategory, foreignExpenseCategory } =
      await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const incomeResponse = await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: incomeCategory.id,
        year: 2028,
        month: 5,
        amount: 5_000,
      }),
    );
    const foreignResponse = await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: foreignExpenseCategory.id,
        year: 2028,
        month: 5,
        amount: 5_000,
      }),
    );

    expect(incomeResponse.status).toBe(400);
    expect(foreignResponse.status).toBe(400);

    const ownerResponse = await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 5,
        amount: 5_000,
      }),
    );
    expect(ownerResponse.status).toBe(200);

    authMocks.getAuthenticatedUserId.mockResolvedValue(otherUser.id);
    const readResponse = await getCategoryMonthlyLimits(
      limitRequest("GET", { year: 2028, month: 5 }),
    );
    const readBody = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readBody.data.items).toHaveLength(1);
    expect(readBody.data.items[0].category.id).toBe(foreignExpenseCategory.id);
    expect(readBody.data.items[0].limit).toBeNull();
  });

  it("removes only the limit and preserves transactions", async () => {
    const { owner, account, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await prisma.transaction.create({
      data: {
        amount: 2_500,
        year: 2028,
        month: 6,
        day: 1,
        type: "EXPENSE",
        description: "Compra",
        status: "COMPLETED",
        accountId: account.id,
        categoryId: expenseCategory.id,
        userId: owner.id,
      },
    });
    await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 6,
        amount: 7_500,
      }),
    );

    const removeResponse = await removeCategoryMonthlyLimit(
      limitRequest("DELETE", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 6,
      }),
    );

    expect(removeResponse.status).toBe(200);
    expect(
      await prisma.categoryMonthlyLimit.count({
        where: { userId: owner.id, categoryId: expenseCategory.id },
      }),
    ).toBe(0);
    expect(
      await prisma.transaction.count({
        where: { userId: owner.id, categoryId: expenseCategory.id },
      }),
    ).toBe(1);
  });

  it("rejects non-positive amounts", async () => {
    const { owner, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 7,
        amount: 0,
      }),
    );

    expect(response.status).toBe(400);
    expect(await prisma.categoryMonthlyLimit.count({ where: { userId: owner.id } })).toBe(0);
  });
});
