import { afterAll, afterEach, describe, expect, it } from "vitest";

import { previewMerchantAliasForUser } from "@/app/lib/merchants/merchant-alias-preview";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const factory = new FinancialTestFactory();

afterEach(async () => {
  await factory.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("merchant alias preview", () => {
  it("blocks an exact equivalent and exposes the current owner for explicit move", async () => {
    const owner = await factory.user();
    const [source, target] = await Promise.all([
      prisma.merchant.create({ data: { userId: owner.id, name: "Origem" } }),
      prisma.merchant.create({ data: { userId: owner.id, name: "Destino" } }),
    ]);
    await prisma.merchantAlias.create({
      data: {
        userId: owner.id,
        merchantId: source.id,
        operator: "EQUALS",
        pattern: "IFOOD",
        normalizedPattern: "ifood",
        priority: 100,
      },
    });

    const preview = await previewMerchantAliasForUser(owner.id, {
      merchantId: target.id,
      operator: "EQUALS",
      pattern: " iFood ",
      priority: 100,
      description: "IFOOD",
    });

    expect(preview.status).toBe(200);
    expect(preview.data).toMatchObject({
      canSave: false,
      canMove: true,
      exactEquivalent: {
        pattern: "IFOOD",
        merchant: { id: source.id, name: "Origem" },
      },
      test: {
        matchesCandidate: true,
        conflict: true,
      },
    });
  });

  it("reports potential overlap but keeps it saveable", async () => {
    const owner = await factory.user();
    const [source, target] = await Promise.all([
      prisma.merchant.create({
        data: { userId: owner.id, name: "Mercado Pago" },
      }),
      prisma.merchant.create({ data: { userId: owner.id, name: "iFood" } }),
    ]);
    await prisma.merchantAlias.create({
      data: {
        userId: owner.id,
        merchantId: source.id,
        operator: "CONTAINS",
        pattern: "MERCADOPAGO",
        normalizedPattern: "mercadopago",
        priority: 100,
      },
    });

    const preview = await previewMerchantAliasForUser(owner.id, {
      merchantId: target.id,
      operator: "CONTAINS",
      pattern: "IFOOD",
      priority: 100,
      description: "MERCADOPAGO*IFOOD 123",
    });

    expect(preview.data).toMatchObject({
      canSave: true,
      canMove: false,
      overlapCount: 1,
      test: {
        matchesCandidate: true,
        conflict: true,
      },
    });
  });

  it("rejects preview ownership against another user's merchant", async () => {
    const [owner, other] = await Promise.all([factory.user(), factory.user()]);
    const foreign = await prisma.merchant.create({
      data: { userId: other.id, name: "Estrangeiro" },
    });

    const preview = await previewMerchantAliasForUser(owner.id, {
      merchantId: foreign.id,
      operator: "EQUALS",
      pattern: "TESTE",
      priority: 100,
    });

    expect(preview).toMatchObject({
      status: 400,
      data: null,
    });
  });
});
