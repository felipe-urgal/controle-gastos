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
import { categoryCrud } from "@/app/lib/crud/category.crud";
import { prisma } from "@/app/lib/prisma";
import type { SupportedCurrency } from "@/app/types/financial-summary";

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

  const [brlAccount, usdAccount, otherAccount] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Conta BRL ${suffix}`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Conta USD ${suffix}`,
        type: "CREDIT_DEBIT",
        currency: "USD",
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
    brlAccount,
    usdAccount,
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
    currency?: SupportedCurrency | string;
    amount?: number;
  },
) {
  const currency = input.currency ?? "BRL";
  const url = new URL("http://localhost/api/category-limits");
  url.searchParams.set("year", String(input.year));
  url.searchParams.set("month", String(input.month));
  url.searchParams.set("currency", currency);
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
            currency,
            amount: input.amount,
          })
        : undefined,
  });
}

describe("category monthly limits integration", () => {
  it("derives realized independently for each currency and keeps separate limits", async () => {
    const { owner, brlAccount, usdAccount, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await prisma.transaction.createMany({
      data: [
        {
          amount: 4_000,
          year: 2028,
          month: 4,
          day: 2,
          type: "EXPENSE",
          description: "BRL realizado",
          status: "COMPLETED",
          accountId: brlAccount.id,
          categoryId: expenseCategory.id,
          userId: owner.id,
        },
        {
          amount: 2_500,
          year: 2028,
          month: 4,
          day: 3,
          type: "EXPENSE",
          description: "USD realizado",
          status: "COMPLETED",
          accountId: usdAccount.id,
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
          accountId: brlAccount.id,
          categoryId: expenseCategory.id,
          userId: owner.id,
        },
      ],
    });

    await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 4,
        currency: "BRL",
        amount: 10_000,
      }),
    );
    await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 4,
        currency: "USD",
        amount: 8_000,
      }),
    );

    const brlResponse = await getCategoryMonthlyLimits(
      limitRequest("GET", { year: 2028, month: 4, currency: "BRL" }),
    );
    const usdResponse = await getCategoryMonthlyLimits(
      limitRequest("GET", { year: 2028, month: 4, currency: "USD" }),
    );
    const brlBody = await brlResponse.json();
    const usdBody = await usdResponse.json();

    expect(brlBody.data.items[0]).toMatchObject({
      currency: "BRL",
      limit: { amount: 10_000, currency: "BRL" },
      realized: 4_000,
      remaining: 6_000,
      percentage: 40,
    });
    expect(usdBody.data.items[0]).toMatchObject({
      currency: "USD",
      limit: { amount: 8_000, currency: "USD" },
      realized: 2_500,
      remaining: 5_500,
      percentage: 31.3,
    });
    expect(
      await prisma.categoryMonthlyLimit.count({
        where: { userId: owner.id, categoryId: expenseCategory.id, year: 2028, month: 4 },
      }),
    ).toBe(2);
  });

  it("upserts only the selected currency and rejects unsupported currencies", async () => {
    const { owner, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 12,
        currency: "BRL",
        amount: 8_000,
      }),
    );
    await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 12,
        currency: "BRL",
        amount: 9_000,
      }),
    );
    await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 12,
        currency: "EUR",
        amount: 11_000,
      }),
    );

    const invalidResponse = await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 12,
        currency: "XYZ",
        amount: 1_000,
      }),
    );

    const limits = await prisma.categoryMonthlyLimit.findMany({
      where: { userId: owner.id, categoryId: expenseCategory.id },
      orderBy: { currency: "asc" },
    });

    expect(invalidResponse.status).toBe(400);
    expect(limits.map(({ currency, amount }) => ({ currency, amount }))).toEqual([
      { currency: "BRL", amount: 9_000 },
      { currency: "EUR", amount: 11_000 },
    ]);
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
        currency: "BRL",
        amount: 5_000,
      }),
    );
    const foreignResponse = await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: foreignExpenseCategory.id,
        year: 2028,
        month: 5,
        currency: "BRL",
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
        currency: "BRL",
        amount: 5_000,
      }),
    );
    expect(ownerResponse.status).toBe(200);

    authMocks.getAuthenticatedUserId.mockResolvedValue(otherUser.id);
    const readResponse = await getCategoryMonthlyLimits(
      limitRequest("GET", { year: 2028, month: 5, currency: "BRL" }),
    );
    const readBody = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readBody.data.items).toHaveLength(1);
    expect(readBody.data.items[0].category.id).toBe(foreignExpenseCategory.id);
    expect(readBody.data.items[0].limit).toBeNull();
  });

  it("blocks changing an expense category with any currency limit to income", async () => {
    const { owner, expenseCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await upsertCategoryMonthlyLimit(
      limitRequest("PUT", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 8,
        currency: "USD",
        amount: 5_000,
      }),
    );

    const updateResponse = await categoryCrud.update(
      new Request(`http://localhost/api/categories/${expenseCategory.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "INCOME" }),
      }),
      { params: Promise.resolve({ id: expenseCategory.id }) },
    );

    expect(updateResponse.status).toBe(400);
    expect(
      (await prisma.category.findUnique({ where: { id: expenseCategory.id } }))?.type,
    ).toBe("EXPENSE");
  });

  it("removes only the requested currency limit and preserves transactions", async () => {
    const { owner, brlAccount, expenseCategory } = await createFixture();
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
        accountId: brlAccount.id,
        categoryId: expenseCategory.id,
        userId: owner.id,
      },
    });
    await Promise.all([
      upsertCategoryMonthlyLimit(
        limitRequest("PUT", {
          categoryId: expenseCategory.id,
          year: 2028,
          month: 6,
          currency: "BRL",
          amount: 7_500,
        }),
      ),
      upsertCategoryMonthlyLimit(
        limitRequest("PUT", {
          categoryId: expenseCategory.id,
          year: 2028,
          month: 6,
          currency: "USD",
          amount: 6_000,
        }),
      ),
    ]);

    const removeResponse = await removeCategoryMonthlyLimit(
      limitRequest("DELETE", {
        categoryId: expenseCategory.id,
        year: 2028,
        month: 6,
        currency: "BRL",
      }),
    );

    expect(removeResponse.status).toBe(200);
    expect(
      await prisma.categoryMonthlyLimit.count({
        where: { userId: owner.id, categoryId: expenseCategory.id, currency: "BRL" },
      }),
    ).toBe(0);
    expect(
      await prisma.categoryMonthlyLimit.count({
        where: { userId: owner.id, categoryId: expenseCategory.id, currency: "USD" },
      }),
    ).toBe(1);
    expect(
      await prisma.transaction.count({
        where: { userId: owner.id, categoryId: expenseCategory.id },
      }),
    ).toBe(1);
  });
});
