import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { mergeMerchant } from "@/app/lib/merchants/merchant-merge";
import { MONTH_LOCKED_CODE } from "@/app/lib/monthly-closing/month-lock";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function setup() {
  const owner = await fixtures.user({ name: "Merchant Merge Owner" });
  const account = await fixtures.account(owner.id, { name: "Conta merge", currency: "BRL" });
  const category = await fixtures.category(owner.id, { name: "Mercado merge", type: "EXPENSE" });
  const source = await prisma.merchant.create({ data: { userId: owner.id, name: "Padaria Central" } });
  const target = await prisma.merchant.create({ data: { userId: owner.id, name: "Padaria Central Ltda" } });
  authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
  return { owner, account, category, source, target };
}

function merge(sourceId: string, targetId: string) {
  return mergeMerchant(
    new Request(`http://localhost/api/merchants/${sourceId}/merge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetId }),
    }),
    { params: Promise.resolve({ id: sourceId }) },
  );
}

function transaction(userId: string, accountId: string, categoryId: string, merchantId: string, month: number) {
  return prisma.transaction.create({
    data: {
      userId, accountId, categoryId, merchantId,
      amount: 4_000, type: "EXPENSE", description: "Compra", status: "COMPLETED",
      year: 2028, month, day: 9,
    },
  });
}

function alias(userId: string, merchantId: string, pattern: string) {
  return prisma.merchantAlias.create({
    data: { userId, merchantId, pattern, normalizedPattern: pattern.toLowerCase(), operator: "CONTAINS" },
  });
}

describe("mesclar estabelecimentos", () => {
  it("move lançamentos e aliases, descarta alias repetido, registra eventos e apaga a origem", async () => {
    const { owner, account, category, source, target } = await setup();
    const purchase = await transaction(owner.id, account.id, category.id, source.id, 4);
    await alias(owner.id, source.id, "padaria");
    await alias(owner.id, source.id, "padaria central");
    await alias(owner.id, target.id, "padaria");

    const response = await merge(source.id, target.id);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      movedTransactions: 1,
      movedAliases: 1,
      discardedAliases: 1,
    });

    expect((await prisma.transaction.findUniqueOrThrow({ where: { id: purchase.id } })).merchantId).toBe(target.id);
    const aliases = await prisma.merchantAlias.findMany({ where: { userId: owner.id }, orderBy: { pattern: "asc" } });
    expect(aliases.map((item) => [item.merchantId, item.pattern])).toEqual([
      [target.id, "padaria"],
      [target.id, "padaria central"],
    ]);
    const events = await prisma.merchantAliasEvent.findMany({ where: { userId: owner.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: "REASSIGNED", sourceMerchantId: source.id, targetMerchantId: target.id });
    expect(await prisma.merchant.findUnique({ where: { id: source.id } })).toBeNull();
  });

  it("recusa a mesma entidade, destino inativo e estabelecimento de outro usuário", async () => {
    const { owner, source, target } = await setup();
    const inactive = await prisma.merchant.create({ data: { userId: owner.id, name: "Inativo", isActive: false } });
    const stranger = await fixtures.user({ name: "Merchant Stranger" });
    const foreign = await prisma.merchant.create({ data: { userId: stranger.id, name: "Alheio" } });

    expect((await merge(source.id, source.id)).status).toBe(400);
    expect((await merge(source.id, inactive.id)).status).toBe(400);
    expect((await merge(source.id, foreign.id)).status).toBe(404);
    expect((await merge(foreign.id, target.id)).status).toBe(404);
    expect(await prisma.merchant.findUnique({ where: { id: source.id } })).not.toBeNull();
  });

  it("mês travado bloqueia a mesclagem inteira, sem mudar nada", async () => {
    const { owner, account, category, source, target } = await setup();
    const open = await transaction(owner.id, account.id, category.id, source.id, 4);
    await transaction(owner.id, account.id, category.id, source.id, 5);
    await prisma.lockedMonth.create({ data: { userId: owner.id, year: 2028, month: 5 } });

    const response = await merge(source.id, target.id);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe(MONTH_LOCKED_CODE);
    expect((await prisma.transaction.findUniqueOrThrow({ where: { id: open.id } })).merchantId).toBe(source.id);
    expect(await prisma.merchant.findUnique({ where: { id: source.id } })).not.toBeNull();
  });
});
