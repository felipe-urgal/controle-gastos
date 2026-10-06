import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  createMerchantAlias,
  reassignMerchantAlias,
} from "@/app/lib/merchants/merchant-alias-crud";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const factory = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await factory.cleanup();  it("reclassifies an equivalent alias atomically after an explicit correction", async () => {
    const owner = await factory.user();
    const [merchantA, merchantB] = await Promise.all([
      prisma.merchant.create({ data: { userId: owner.id, name: "Origem" } }),
      prisma.merchant.create({ data: { userId: owner.id, name: "Destino" } }),
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
    expect(body.data).toMatchObject({
      reclassified: false,
      mergedCount: 1,
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
});

afterAll(async () => {
  await prisma.$disconnect();
});

function request(body: unknown) {
  return new Request("http://localhost/api/merchant-aliases", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("merchant alias CRUD integration", () => {
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
    expect(body.error.code).toBe("MERCHANT_ALIAS_OWNED_BY_OTHER_MERCHANT");
    expect(body.error.message).toContain("Loja A");
  });

  it("serializes concurrent equivalent aliases so only one merchant can own them", async () => {
    const owner = await factory.user();
    const [merchantA, merchantB] = await Promise.all([
      prisma.merchant.create({ data: { userId: owner.id, name: "Concorrente A" } }),
      prisma.merchant.create({ data: { userId: owner.id, name: "Concorrente B" } }),
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
});
