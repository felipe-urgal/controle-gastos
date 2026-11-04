import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { GET } from "@/app/api/transactions/quick-entry/route";
import { UnauthorizedError } from "@/app/lib/auth/auth-errors";
import { prisma } from "@/app/lib/prisma";
import { suggestQuickEntry } from "@/app/lib/transactions/quick-entry-suggestion";

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

async function setup() {
  const user = await prisma.user.create({
    data: { name: "Sugestão", email: `sugestao-${randomUUID()}@example.com`, password: "test-hash" },
  });
  createdUserIds.push(user.id);
  const account = (name: string, isActive = true) =>
    prisma.account.create({ data: { name, type: "CREDIT_DEBIT", currency: "BRL", userId: user.id, isActive } });
  const category = (name: string, type: "EXPENSE" | "INCOME", isActive = true) =>
    prisma.category.create({ data: { name: `${name} ${randomUUID()}`.slice(0, 50), type, userId: user.id, isActive } });
  return { user, account, category };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

function tx(
  ctx: Ctx,
  data: {
    accountId: string;
    categoryId: string;
    description: string;
    type?: "EXPENSE" | "INCOME";
    day?: number;
    merchantId?: string | null;
    status?: "COMPLETED" | "CANCELLED";
  },
) {
  return prisma.transaction.create({
    data: {
      userId: ctx.user.id,
      accountId: data.accountId,
      categoryId: data.categoryId,
      merchantId: data.merchantId ?? null,
      type: data.type ?? "EXPENSE",
      kind: "NORMAL",
      status: data.status ?? "COMPLETED",
      amount: 1_000,
      description: data.description,
      year: 2026,
      month: 10,
      day: data.day ?? 10,
    },
  });
}

const expense = (description: string) => ({ description, type: "EXPENSE" as const });

describe("suggestQuickEntry", () => {
  it("sem nenhum histórico não sugere nada", async () => {
    const ctx = await setup();
    expect(await suggestQuickEntry(ctx.user.id, expense("mercado"))).toEqual({
      accountId: null,
      categoryId: null,
      merchantId: null,
      merchantName: null,
      source: "NONE",
    });
  });

  it("usa conta e categoria do último lançamento com a mesma descrição, sem diferenciar maiúsculas", async () => {
    const ctx = await setup();
    const [itau, nubank] = [await ctx.account("Itaú"), await ctx.account("Nubank")];
    const [mercado, lazer] = [await ctx.category("Mercado", "EXPENSE"), await ctx.category("Lazer", "EXPENSE")];
    await tx(ctx, { accountId: itau.id, categoryId: lazer.id, description: "Mercado", day: 2 });
    await tx(ctx, { accountId: nubank.id, categoryId: mercado.id, description: "mercado", day: 9 });

    const suggestion = await suggestQuickEntry(ctx.user.id, expense("MERCADO"));

    expect(suggestion).toMatchObject({ accountId: nubank.id, categoryId: mercado.id, source: "SAME_DESCRIPTION" });
  });

  it("não empresta categoria de outro tipo: descrição só vista como receita não sugere categoria de despesa", async () => {
    const ctx = await setup();
    const account = await ctx.account("Itaú");
    const salary = await ctx.category("Salário", "INCOME");
    await tx(ctx, { accountId: account.id, categoryId: salary.id, description: "Freela", type: "INCOME" });

    const asExpense = await suggestQuickEntry(ctx.user.id, expense("freela"));
    const asIncome = await suggestQuickEntry(ctx.user.id, { description: "freela", type: "INCOME" });

    expect(asExpense).toMatchObject({ categoryId: null, accountId: account.id, source: "LAST_ACCOUNT" });
    expect(asIncome).toMatchObject({ categoryId: salary.id, source: "SAME_DESCRIPTION" });
  });

  it("ignora conta e categoria inativas e lançamentos cancelados", async () => {
    const ctx = await setup();
    const [active, inactive] = [await ctx.account("Ativa"), await ctx.account("Antiga", false)];
    const [fresh, old] = [await ctx.category("Nova", "EXPENSE"), await ctx.category("Velha", "EXPENSE", false)];
    await tx(ctx, { accountId: active.id, categoryId: fresh.id, description: "padaria", day: 1 });
    await tx(ctx, { accountId: inactive.id, categoryId: fresh.id, description: "padaria", day: 5 });
    await tx(ctx, { accountId: active.id, categoryId: old.id, description: "padaria", day: 6 });
    await tx(ctx, { accountId: active.id, categoryId: fresh.id, description: "padaria", day: 8, status: "CANCELLED" });

    const suggestion = await suggestQuickEntry(ctx.user.id, expense("padaria"));

    expect(suggestion).toMatchObject({ accountId: active.id, categoryId: fresh.id });
  });

  it("reconhece o estabelecimento pelos aliases e usa o último lançamento dele", async () => {
    const ctx = await setup();
    const account = await ctx.account("Itaú");
    const transport = await ctx.category("Transporte", "EXPENSE");
    const merchant = await prisma.merchant.create({ data: { name: "Uber", userId: ctx.user.id } });
    await prisma.merchantAlias.create({
      data: { userId: ctx.user.id, merchantId: merchant.id, pattern: "uber", normalizedPattern: "uber", operator: "CONTAINS" },
    });
    await tx(ctx, { accountId: account.id, categoryId: transport.id, description: "Corrida centro", merchantId: merchant.id });

    const suggestion = await suggestQuickEntry(ctx.user.id, expense("uber trip 18"));

    expect(suggestion).toMatchObject({
      accountId: account.id,
      categoryId: transport.id,
      merchantId: merchant.id,
      merchantName: "Uber",
      source: "MERCHANT",
    });
  });

  it("sem descrição conhecida, sugere só a última conta usada", async () => {
    const ctx = await setup();
    const [older, latest] = [await ctx.account("Antiga"), await ctx.account("Recente")];
    const category = await ctx.category("Geral", "EXPENSE");
    await tx(ctx, { accountId: older.id, categoryId: category.id, description: "a", day: 1 });
    await tx(ctx, { accountId: latest.id, categoryId: category.id, description: "b", day: 20 });

    const suggestion = await suggestQuickEntry(ctx.user.id, expense("coisa nova"));

    expect(suggestion).toMatchObject({ accountId: latest.id, categoryId: null, source: "LAST_ACCOUNT" });
  });

  it("nunca usa dados de outro usuário", async () => {
    const owner = await setup();
    const other = await setup();
    const account = await owner.account("Dele");
    const category = await owner.category("Dele", "EXPENSE");
    await tx(owner, { accountId: account.id, categoryId: category.id, description: "mercado" });

    expect(await suggestQuickEntry(other.user.id, expense("mercado"))).toMatchObject({
      accountId: null,
      categoryId: null,
      source: "NONE",
    });
  });
});

describe("GET /api/transactions/quick-entry", () => {
  const request = (query: string) => new Request(`http://localhost/api/transactions/quick-entry?${query}`);

  it("exige autenticação", async () => {
    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());
    expect((await GET(request("description=mercado"))).status).toBe(401);
  });

  it("devolve a sugestão do usuário autenticado e valida a consulta", async () => {
    const ctx = await setup();
    const account = await ctx.account("Itaú");
    const category = await ctx.category("Mercado", "EXPENSE");
    await tx(ctx, { accountId: account.id, categoryId: category.id, description: "mercado" });
    authMocks.getAuthenticatedUserId.mockResolvedValue(ctx.user.id);

    const ok = await GET(request("description=mercado&type=EXPENSE"));
    expect(ok.status).toBe(200);
    expect((await ok.json()).data).toMatchObject({ accountId: account.id, categoryId: category.id, source: "SAME_DESCRIPTION" });

    expect((await GET(request("type=OUTRO"))).status).toBe(400);
    expect((await GET(request(`description=${"x".repeat(101)}`))).status).toBe(400);
  });
});
