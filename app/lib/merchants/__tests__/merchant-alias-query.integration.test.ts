import { afterAll, afterEach, describe, expect, it } from "vitest";

import {
  findMatchingMerchantAliasesForDescriptions,
  findMatchingMerchantAliasesForUser,
} from "@/app/lib/merchants/merchant-alias-query";
import { matchMerchantAlias } from "@/app/lib/merchants/merchant-alias-matching";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const factory = new FinancialTestFactory();

afterEach(async () => {
  await factory.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("merchant alias candidate query", () => {
  it("returns only matching candidates and ignores inactive or foreign merchants", async () => {
    const [owner, other] = await Promise.all([factory.user(), factory.user()]);
    const [active, inactive, foreign] = await Promise.all([
      prisma.merchant.create({ data: { userId: owner.id, name: "Ativo" } }),
      prisma.merchant.create({
        data: { userId: owner.id, name: "Inativo", isActive: false },
      }),
      prisma.merchant.create({ data: { userId: other.id, name: "Outro" } }),
    ]);

    await prisma.merchantAlias.createMany({
      data: [
        {
          userId: owner.id,
          merchantId: active.id,
          operator: "EQUALS",
          pattern: "IFOOD PEDIDO 123",
          normalizedPattern: "ifood pedido 123",
          priority: 100,
        },
        {
          userId: owner.id,
          merchantId: active.id,
          operator: "STARTS_WITH",
          pattern: "IFOOD",
          normalizedPattern: "ifood",
          priority: 100,
        },
        {
          userId: owner.id,
          merchantId: active.id,
          operator: "CONTAINS",
          pattern: "PEDIDO",
          normalizedPattern: "pedido",
          priority: 100,
        },
        {
          userId: owner.id,
          merchantId: active.id,
          operator: "CONTAINS",
          pattern: "NAO BATE",
          normalizedPattern: "nao bate",
          priority: 100,
        },
        {
          userId: owner.id,
          merchantId: inactive.id,
          operator: "CONTAINS",
          pattern: "IFOOD",
          normalizedPattern: "ifood",
          priority: 1,
        },
        {
          userId: other.id,
          merchantId: foreign.id,
          operator: "CONTAINS",
          pattern: "IFOOD",
          normalizedPattern: "ifood",
          priority: 1,
        },
      ],
    });

    const candidates = await findMatchingMerchantAliasesForUser(
      owner.id,
      "IFOOD PEDIDO 123",
    );

    expect(candidates).toHaveLength(3);
    expect(new Set(candidates.map((item) => item.merchantId))).toEqual(
      new Set([active.id]),
    );
    expect(
      matchMerchantAlias(candidates, "IFOOD PEDIDO 123"),
    ).toMatchObject({
      merchantId: active.id,
      conflict: false,
    });
  });

  it("matches a batch efficiently with one thousand aliases", async () => {
    const owner = await factory.user();
    const merchant = await prisma.merchant.create({
      data: { userId: owner.id, name: "Escala" },
    });

    await prisma.merchantAlias.createMany({
      data: Array.from({ length: 1000 }, (_, index) => ({
        userId: owner.id,
        merchantId: merchant.id,
        operator: "CONTAINS" as const,
        pattern: `PADRAO ${String(index).padStart(4, "0")}`,
        normalizedPattern: `padrao ${String(index).padStart(4, "0")}`,
        priority: 100,
      })),
    });

    const startedAt = performance.now();
    const grouped = await findMatchingMerchantAliasesForDescriptions(
      owner.id,
      ["COMPRA PADRAO 0999", "SEM CORRESPONDENCIA"],
    );
    const elapsedMs = performance.now() - startedAt;

    expect(grouped.get("compra padrao 0999")).toHaveLength(1);
    expect(grouped.get("sem correspondencia")).toEqual([]);
    expect(elapsedMs).toBeLessThan(5000);
  });
});
