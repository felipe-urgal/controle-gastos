import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

const rateLimitMocks = vi.hoisted(() => ({
  consumeTransactionMutationRateLimit: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/security/application-rate-limit", () => ({
  consumeTransactionMutationRateLimit:
    rateLimitMocks.consumeTransactionMutationRateLimit,
}));

import { merchantCrud } from "@/app/lib/merchants/merchant-crud";
import { prisma } from "@/app/lib/prisma";
import { transactionCrud } from "@/app/lib/transactions/transaction-crud";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const factory = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  rateLimitMocks.consumeTransactionMutationRateLimit.mockReset();
  await factory.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function request(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("merchant domain integration", () => {
  it("paginates and searches beyond the first 100 merchants", async () => {
    const owner = await factory.user();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await prisma.merchant.createMany({
      data: Array.from({ length: 105 }, (_, index) => ({
        userId: owner.id,
        name: `Merchant ${String(index).padStart(3, "0")}`,
      })),
    });

    const page = await merchantCrud.list(
      request(
        "http://localhost/api/merchants?page=11&pageSize=10",
        "GET",
      ),
    );
    expect(page.status).toBe(200);
    const pageBody = await page.json();
    expect(pageBody.data).toMatchObject({
      total: 105,
      page: 11,
      pageSize: 10,
      totalPages: 11,
    });
    expect(pageBody.data.items).toHaveLength(5);

    const searched = await merchantCrud.list(
      request(
        "http://localhost/api/merchants?page=1&pageSize=10&search=Merchant%20104",
        "GET",
      ),
    );
    const searchedBody = await searched.json();
    expect(searchedBody.data.total).toBe(1);
    expect(searchedBody.data.items[0].name).toBe("Merchant 104");
  });

  it("keeps merchants isolated by user and enforces case-insensitive names", async () => {
    const [owner, other] = await Promise.all([factory.user(), factory.user()]);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const created = await merchantCrud.create(
      request("http://localhost/api/merchants", "POST", { name: "iFood" }),
    );
    expect(created.status).toBe(201);

    const duplicate = await merchantCrud.create(
      request("http://localhost/api/merchants", "POST", { name: "IFOOD" }),
    );
    expect(duplicate.status).toBe(409);

    await prisma.merchant.create({
      data: { userId: other.id, name: "iFood" },
    });

    const listed = await merchantCrud.list(
      request("http://localhost/api/merchants", "GET"),
    );
    const body = await listed.json();

    expect(listed.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]).toMatchObject({
      name: "iFood",
      isActive: true,
      transactionsCount: 0,
      aliasesCount: 0,
    });
  });

  it("serializes equivalent merchant names under concurrent creates", async () => {
    const owner = await factory.user();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const [left, right] = await Promise.all([
      merchantCrud.create(
        request("http://localhost/api/merchants", "POST", {
          name: "Mercado   Central",
        }),
      ),
      merchantCrud.create(
        request("http://localhost/api/merchants", "POST", {
          name: "MERCADO CENTRAL",
        }),
      ),
    ]);

    expect([left.status, right.status].sort()).toEqual([201, 409]);

    const merchants = await prisma.merchant.findMany({
      where: { userId: owner.id },
      select: { name: true },
    });
    expect(merchants).toHaveLength(1);
  });

  it("rejects a foreign or inactive merchant and allows clearing the association", async () => {
    const [owner, other] = await Promise.all([factory.user(), factory.user()]);
    const [account, category] = await Promise.all([
      factory.account(owner.id),
      factory.category(owner.id),
    ]);
    const [ownedMerchant, foreignMerchant, inactiveMerchant] =
      await Promise.all([
        prisma.merchant.create({
          data: { userId: owner.id, name: "Padaria" },
        }),
        prisma.merchant.create({
          data: { userId: other.id, name: "Padaria" },
        }),
        prisma.merchant.create({
          data: { userId: owner.id, name: "Loja antiga", isActive: false },
        }),
      ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    rateLimitMocks.consumeTransactionMutationRateLimit.mockResolvedValue({
      limited: false,
      retryAfterSeconds: 0,
    });

    const payload = {
      amount: 2_500,
      description: "Café",
      year: 2026,
      month: 10,
      day: 1,
      accountId: account.id,
      categoryId: category.id,
      type: "EXPENSE",
      status: "COMPLETED",
    };

    const foreign = await transactionCrud.create(
      request("http://localhost/api/transactions", "POST", {
        ...payload,
        merchantId: foreignMerchant.id,
      }),
    );
    expect(foreign.status).toBe(400);

    const inactive = await transactionCrud.create(
      request("http://localhost/api/transactions", "POST", {
        ...payload,
        merchantId: inactiveMerchant.id,
      }),
    );
    expect(inactive.status).toBe(400);

    const created = await transactionCrud.create(
      request("http://localhost/api/transactions", "POST", {
        ...payload,
        merchantId: ownedMerchant.id,
      }),
    );
    expect(created.status).toBe(201);

    const createdBody = await created.json();
    expect(createdBody.data.merchant).toEqual({
      id: ownedMerchant.id,
      name: "Padaria",
      isActive: true,
    });

    const cleared = await transactionCrud.update(
      request(
        `http://localhost/api/transactions/${createdBody.data.id}`,
        "PUT",
        { merchantId: null },
      ),
      { params: Promise.resolve({ id: createdBody.data.id }) },
    );
    expect(cleared.status).toBe(200);

    const clearedBody = await cleared.json();
    expect(clearedBody.data.merchant).toBeNull();
  });

  it("filters transactions by merchant and blocks hard-delete when history depends on it", async () => {
    const owner = await factory.user();
    const [account, category] = await Promise.all([
      factory.account(owner.id),
      factory.category(owner.id),
    ]);
    const [merchantA, merchantB] = await Promise.all([
      prisma.merchant.create({
        data: { userId: owner.id, name: "Mercado A" },
      }),
      prisma.merchant.create({
        data: { userId: owner.id, name: "Mercado B" },
      }),
    ]);
    const [transactionA, transactionB] = await Promise.all([
      factory.transaction({
        userId: owner.id,
        accountId: account.id,
        categoryId: category.id,
        overrides: {
          merchantId: merchantA.id,
          year: 2026,
          month: 10,
          day: 1,
        },
      }),
      factory.transaction({
        userId: owner.id,
        accountId: account.id,
        categoryId: category.id,
        overrides: {
          merchantId: merchantB.id,
          year: 2026,
          month: 10,
          day: 2,
        },
      }),
    ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const filtered = await transactionCrud.list(
      request(
        `http://localhost/api/transactions?year=2026&month=10&merchantId=${merchantA.id}`,
        "GET",
      ),
    );
    const filteredBody = await filtered.json();

    expect(filtered.status).toBe(200);
    expect(
      filteredBody.data.items.map((item: { id: string }) => item.id),
    ).toEqual([transactionA.id]);
    expect(filteredBody.data.items[0].merchant).toMatchObject({
      id: merchantA.id,
      name: "Mercado A",
    });

    const removed = await merchantCrud.remove(
      request(
        `http://localhost/api/merchants/${merchantA.id}`,
        "DELETE",
      ),
      { params: Promise.resolve({ id: merchantA.id }) },
    );
    expect(removed.status).toBe(409);

    const removedBody = await removed.json();
    expect(removedBody.error.code).toBe("MERCHANT_IN_USE");

    expect(
      await prisma.transaction.findUnique({
        where: { id: transactionA.id },
        select: { id: true, merchantId: true },
      }),
    ).toEqual({ id: transactionA.id, merchantId: merchantA.id });

    expect(
      await prisma.transaction.findUnique({
        where: { id: transactionB.id },
        select: { id: true, merchantId: true },
      }),
    ).toEqual({ id: transactionB.id, merchantId: merchantB.id });
  });

  it("blocks hard-delete while aliases exist and deletes a truly unused merchant", async () => {
    const owner = await factory.user();
    const [withAlias, unused] = await Promise.all([
      prisma.merchant.create({
        data: { userId: owner.id, name: "Merchant com alias" },
      }),
      prisma.merchant.create({
        data: { userId: owner.id, name: "Merchant sem uso" },
      }),
    ]);

    await prisma.merchantAlias.create({
      data: {
        userId: owner.id,
        merchantId: withAlias.id,
        operator: "EQUALS",
        pattern: "LOJA TESTE",
        normalizedPattern: "loja teste",
        priority: 100,
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const blocked = await merchantCrud.remove(
      request(
        `http://localhost/api/merchants/${withAlias.id}`,
        "DELETE",
      ),
      { params: Promise.resolve({ id: withAlias.id }) },
    );
    expect(blocked.status).toBe(409);

    const blockedBody = await blocked.json();
    expect(blockedBody.error.code).toBe("MERCHANT_HAS_ALIASES");
    expect(
      await prisma.merchant.findUnique({ where: { id: withAlias.id } }),
    ).not.toBeNull();

    const removed = await merchantCrud.remove(
      request(`http://localhost/api/merchants/${unused.id}`, "DELETE"),
      { params: Promise.resolve({ id: unused.id }) },
    );
    expect(removed.status).toBe(200);
    expect(
      await prisma.merchant.findUnique({ where: { id: unused.id } }),
    ).toBeNull();
  });
  it("paginates and searches beyond the first 100 merchants", async () => {
    const owner = await factory.user();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await prisma.merchant.createMany({
      data: Array.from({ length: 125 }, (_, index) => ({
        userId: owner.id,
        name: `Merchant ${String(index).padStart(3, "0")}`,
      })),
    });

    const page = await merchantCrud.list(
      request(
        "http://localhost/api/merchants?page=13&pageSize=10",
        "GET",
      ),
    );
    expect(page.status).toBe(200);
    const pageBody = await page.json();
    expect(pageBody.data).toMatchObject({
      total: 125,
      page: 13,
      pageSize: 10,
      totalPages: 13,
    });
    expect(pageBody.data.items).toHaveLength(5);

    const searched = await merchantCrud.list(
      request(
        "http://localhost/api/merchants?page=1&pageSize=10&search=Merchant%20124",
        "GET",
      ),
    );
    const searchedBody = await searched.json();
    expect(searchedBody.data.total).toBe(1);
    expect(searchedBody.data.items[0].name).toBe("Merchant 124");
  });

  it("persists a generated canonical name while preserving presentation", async () => {
    const owner = await factory.user();
    const merchant = await prisma.merchant.create({
      data: { userId: owner.id, name: "  Mercado   São João  " },
      select: { name: true, normalizedName: true },
    });

    expect(merchant).toEqual({
      name: "  Mercado   São João  ",
      normalizedName: "mercado são joão",
    });
  });


  it("deactivates a merchant while preserving historical transaction linkage", async () => {
    const owner = await factory.user();
    const [account, category, merchant] = await Promise.all([
      factory.account(owner.id),
      factory.category(owner.id),
      prisma.merchant.create({
        data: { userId: owner.id, name: "Merchant histórico" },
      }),
    ]);

    const transaction = await factory.transaction({
      userId: owner.id,
      accountId: account.id,
      categoryId: category.id,
      overrides: {
        merchantId: merchant.id,
        description: "Descrição histórica preservada",
        year: 2026,
        month: 10,
        day: 3,
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await merchantCrud.update(
      request(
        `http://localhost/api/merchants/${merchant.id}`,
        "PUT",
        { isActive: false },
      ),
      { params: Promise.resolve({ id: merchant.id }) },
    );

    expect(response.status).toBe(200);
    expect(
      await prisma.merchant.findUnique({
        where: { id: merchant.id },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: false });
    expect(
      await prisma.transaction.findUnique({
        where: { id: transaction.id },
        select: {
          merchantId: true,
          description: true,
        },
      }),
    ).toEqual({
      merchantId: merchant.id,
      description: "Descrição histórica preservada",
    });
  });

});
