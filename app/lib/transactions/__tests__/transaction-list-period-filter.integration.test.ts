import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

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

describe("transaction list period filter", () => {
  it.each([
    "month=0",
    "month=13",
    "month=1.5",
    "month=-1",
    "year=99",
    "year=1e3",
    "year=2026.5",
  ])("rejects %s with 400", async (query) => {
    const owner = await prisma.user.create({
      data: {
        name: "Period Filter Owner",
        email: `period-filter-${randomUUID()}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await transactionCrud.list(
      new Request(`http://localhost/api/transactions?${query}`),
    );

    expect(response.status).toBe(400);
  });

  it("o resumo traz os pendentes do mês inteiro por moeda, fora do saldo, respeitando o filtro de status", async () => {
    const owner = await prisma.user.create({
      data: { name: "Pending Summary Owner", email: `pending-summary-${randomUUID()}@example.com`, password: "test-hash" },
    });
    createdUserIds.push(owner.id);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const brl = await prisma.account.create({ data: { userId: owner.id, name: "Real", type: "CREDIT_DEBIT", currency: "BRL" } });
    const usd = await prisma.account.create({ data: { userId: owner.id, name: "Dólar", type: "CREDIT_DEBIT", currency: "USD" } });

    const category = await prisma.category.create({ data: { userId: owner.id, name: "Geral" } });
    const base = { userId: owner.id, categoryId: category.id, month: 3, year: 2031, day: 10 };
    const row = (accountId: string, type: "INCOME" | "EXPENSE", status: "COMPLETED" | "PENDING" | "CANCELLED", amount: number) =>
      ({ ...base, accountId, type, status, amount, description: "x" });
    await prisma.transaction.createMany({
      data: [
        row(brl.id, "INCOME", "COMPLETED", 100_000),
        row(brl.id, "EXPENSE", "COMPLETED", 30_000),
        row(brl.id, "INCOME", "PENDING", 5_000),
        row(brl.id, "EXPENSE", "PENDING", 1_250),
        row(brl.id, "EXPENSE", "PENDING", 750),
        row(brl.id, "EXPENSE", "CANCELLED", 99_999),
        // Moeda só com pendente: aparece, com saldo zero.
        row(usd.id, "EXPENSE", "PENDING", 4_000),
      ],
    });

    const read = async (query: string) => {
      const response = await transactionCrud.list(new Request(`http://localhost/api/transactions?${query}`));
      expect(response.status).toBe(200);
      const body = await response.json();
      return body.data.summary as Array<{
        currency: string; income: number; expense: number; balance: number;
        pending: { count: number; income: number; expense: number };
      }>;
    };

    const all = await read("month=3&year=2031&page=1&pageSize=1");
    const real = all.find((item) => item.currency === "BRL")!;
    // Mesmo carregando só 1 item por página, os pendentes são do mês todo; cancelada não conta.
    expect(real).toMatchObject({ income: 100_000, expense: 30_000, balance: 70_000 });
    expect(real.pending).toEqual({ count: 3, income: 5_000, expense: 2_000 });
    expect(all.find((item) => item.currency === "USD")).toMatchObject({
      income: 0, expense: 0, balance: 0, pending: { count: 1, income: 0, expense: 4_000 },
    });

    const onlyCompleted = await read("month=3&year=2031&status=COMPLETED");
    expect(onlyCompleted.find((item) => item.currency === "BRL")!.pending).toEqual({ count: 0, income: 0, expense: 0 });
    expect(onlyCompleted.find((item) => item.currency === "USD")).toBeUndefined();

    const onlyPending = await read("month=3&year=2031&status=PENDING");
    const pendingReal = onlyPending.find((item) => item.currency === "BRL")!;
    expect(pendingReal.balance).toBe(0);
    expect(pendingReal.pending.count).toBe(3);
  });
});
