import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  createMerchantAlias,
  listMerchantAliases,
  reassignMerchantAlias,
  updateMerchantAlias,
} from "@/app/lib/merchants/merchant-alias-crud";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const factory = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await factory.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function request(
  body?: unknown,
  url = "http://localhost/api/merchant-aliases",
  method = "POST",
) {
  return new Request(url, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("merchant alias CRUD integration", () => {
  it("paginates and searches aliases without loading the full collection", async () => {
    const owner = await factory.user();
    const merchant = await prisma.merchant.create({
      data: { userId: owner.id, name: "Loja paginação" },
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await prisma.merchantAlias.createMany({
      data: Array.from({ length: 25 }, (_, index) => ({
        userId: owner.id,
        merchantId: merchant.id,
        operator: "CONTAINS",
        pattern: `PADRAO ${String(index).padStart(2, "0")}`,
        normalizedPattern: `padrao ${String(index).padStart(2, "0")}`,
        priority: 100,
      })),
    });

    const page = await listMerchantAliases(
      request(
        undefined,
        "http://localhost/api/merchant-aliases?page=2&pageSize=10",
        "GET",
      ),
    );
    expect(page.status).toBe(200);
    const pageBody = await page.json();
    expect(pageBody.data).toMatchObject({
      total: 25,
      page: 2,
      pageSize: 10,
      totalPages: 3,
    });
    expect(pageBody.data.items).toHaveLength(10);

    const searched = await listMerchantAliases(
      request(
        undefined,
        "http://localhost/api/merchant-aliases?page=1&pageSize=10&search=PADRAO%2024",
        "GET",
      ),
    );
    const searchedBody = await searched.json();
    expect(searchedBody.data.total).toBe(1);
    expect(searchedBody.data.items[0].pattern).toBe("PADRAO 24");
  });

  it("updates an alias in place and preserves its id", async () => {
    const owner = await factory.user();
    const merchant = await prisma.merchant.create({
      data: { userId: owner.id, name: "Loja editável" },
    });
    const alias = await prisma.merchantAlias.create({
      data: {
        userId: owner.id,
        merchantId: merchant.id,
        operator: "CONTAINS",
        pattern: "LOJA ANTIGA",
        normalizedPattern: "loja antiga",
        priority: 100,
      },
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await updateMerchantAlias(
      request({
        merchantId: merchant.id,
        operator: "STARTS_WITH",
        pattern: "LOJA NOVA",
        priority: 50,
      }),
      { params: Promise.resolve({ id: alias.id }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      id: alias.id,
      operator: "STARTS_WITH",
      pattern: "LOJA NOVA",
      priority: 50,
    });
    expect(
      await prisma.merchantAlias.findUnique({ where: { id: alias.id } }),
    ).toMatchObject({
      merchantId: merchant.id,
      normalizedPattern: "loja nova",
      priority: 50,
    });
  });

  it("rejects an equivalent alias owned by another merchant", async () => {
    const owner = await factory.user();
    const [merchantA, merchantB] = await Promise.all([
      prisma.merchant.create({ data: { userId: owner.id, name: "Loja A" } }),
      prisma.merchant.create({ data: { userId: owner.id, name: "Loja B" } }),
    ]);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const first = await createMerchantAlias(
      request({
        merchantId: merchantA.id,
        operator: "EQUALS",
        pattern: "  IFOOD   ",
      }),
    );
    expect(first.status).toBe(201);

    const duplicate = await createMerchantAlias(
      request({
        merchantId: merchantB.id,
        operator: "EQUALS",
        pattern: "ifood",
      }),
    );
    expect(duplicate.status).toBe(409);

    const body = await duplicate.json();
    expect(body.error.code).toBe(
      "MERCHANT_ALIAS_OWNED_BY_OTHER_MERCHANT",
    );
    expect(body.error.message).toContain("Loja A");
  });

  it("serializes concurrent equivalent aliases so only one merchant can own them", async () => {
    const owner = await factory.user();
    const [merchantA, merchantB] = await Promise.all([
      prisma.merchant.create({
        data: { userId: owner.id, name: "Concorrente A" },
      }),
      prisma.merchant.create({
        data: { userId: owner.id, name: "Concorrente B" },
      }),
    ]);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const [left, right] = await Promise.all([
      createMerchantAlias(
        request({
          merchantId: merchantA.id,
          operator: "STARTS_WITH",
          pattern: "MERCADO TESTE",
        }),
      ),
      createMerchantAlias(
        request({
          merchantId: merchantB.id,
          operator: "STARTS_WITH",
          pattern: "mercado   teste",
        }),
      ),
    ]);

    expect([left.status, right.status].sort()).toEqual([201, 409]);
    expect(
      await prisma.merchantAlias.count({
        where: {
          userId: owner.id,
          operator: "STARTS_WITH",
          normalizedPattern: "mercado teste",
        },
      }),
    ).toBe(1);
  });

  it("reclassifies an equivalent alias from A to B after explicit correction", async () => {
    const owner = await factory.user();
    const [merchantA, merchantB] = await Promise.all([
      prisma.merchant.create({ data: { userId: owner.id, name: "Origem" } }),
      prisma.merchant.create({ data: { userId: owner.id, name: "Destino" } }),
    ]);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await prisma.merchantAlias.create({
      data: {
        userId: owner.id,
        merchantId: merchantA.id,
        operator: "EQUALS",
        pattern: "IFOOD",
        normalizedPattern: "ifood",
        priority: 100,
      },
    });

    const response = await reassignMerchantAlias(
      request({
        merchantId: merchantB.id,
        operator: "EQUALS",
        pattern: "IFOOD",
        priority: 100,
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      reclassified: true,
      mergedCount: 0,
      alias: {
        merchant: { id: merchantB.id, name: "Destino" },
        operator: "EQUALS",
        pattern: "IFOOD",
      },
    });

    const remaining = await prisma.merchantAlias.findMany({
      where: {
        userId: owner.id,
        operator: "EQUALS",
        normalizedPattern: "ifood",
      },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].merchantId).toBe(merchantB.id);
  });

  it("collapses legacy equivalent aliases during explicit reclassification", async () => {
    const owner = await factory.user();
    const [merchantA, merchantB] = await Promise.all([
      prisma.merchant.create({ data: { userId: owner.id, name: "Legado A" } }),
      prisma.merchant.create({ data: { userId: owner.id, name: "Legado B" } }),
    ]);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    await prisma.merchantAlias.createMany({
      data: [
        {
          userId: owner.id,
          merchantId: merchantA.id,
          operator: "EQUALS",
          pattern: "IFOOD",
          normalizedPattern: "ifood",
          priority: 100,
        },
        {
          userId: owner.id,
          merchantId: merchantB.id,
          operator: "EQUALS",
          pattern: "iFood",
          normalizedPattern: "ifood",
          priority: 200,
        },
      ],
    });

    const response = await reassignMerchantAlias(
      request({
        merchantId: merchantB.id,
        operator: "EQUALS",
        pattern: "IFOOD",
        priority: 100,
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.mergedCount).toBe(1);

    const remaining = await prisma.merchantAlias.findMany({
      where: {
        userId: owner.id,
        operator: "EQUALS",
        normalizedPattern: "ifood",
      },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].merchantId).toBe(merchantB.id);
  });

  it("rejects foreign merchant ownership and keeps alias listings isolated", async () => {
    const [owner, other] = await Promise.all([factory.user(), factory.user()]);
    const [ownedMerchant, foreignMerchant] = await Promise.all([
      prisma.merchant.create({
        data: { userId: owner.id, name: "Owned merchant" },
      }),
      prisma.merchant.create({
        data: { userId: other.id, name: "Foreign merchant" },
      }),
    ]);

    await prisma.merchantAlias.create({
      data: {
        userId: other.id,
        merchantId: foreignMerchant.id,
        operator: "EQUALS",
        pattern: "FOREIGN",
        normalizedPattern: "foreign",
        priority: 100,
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const foreignCreate = await createMerchantAlias(
      request({
        merchantId: foreignMerchant.id,
        operator: "EQUALS",
        pattern: "TESTE",
        priority: 100,
      }),
    );
    expect(foreignCreate.status).toBe(400);

    const ownCreate = await createMerchantAlias(
      request({
        merchantId: ownedMerchant.id,
        operator: "EQUALS",
        pattern: "OWNED",
        priority: 100,
      }),
    );
    expect(ownCreate.status).toBe(201);

    const listed = await listMerchantAliases(
      request(
        undefined,
        "http://localhost/api/merchant-aliases?page=1&pageSize=20",
        "GET",
      ),
    );
    const body = await listed.json();

    expect(listed.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]).toMatchObject({
      pattern: "OWNED",
      merchant: { id: ownedMerchant.id },
    });
  });

});
