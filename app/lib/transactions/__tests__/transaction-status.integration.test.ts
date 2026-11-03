import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { updateTransactionStatus } from "@/app/lib/transactions/transaction-status";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function setup(overrides: Record<string, unknown> = {}) {
  const owner = await fixtures.user({ name: "Status Owner" });
  const other = await fixtures.user({ name: "Status Other" });
  const account = await fixtures.account(owner.id, { name: "Conta status", currency: "BRL" });
  const category = await fixtures.category(owner.id, { name: "Despesa status", type: "EXPENSE" });
  const transaction = await prisma.transaction.create({
    data: {
      userId: owner.id,
      accountId: account.id,
      categoryId: category.id,
      amount: 5_000,
      type: "EXPENSE",
      description: "Lançamento",
      status: "COMPLETED",
      year: 2028,
      month: 4,
      day: 10,
      ...overrides,
    },
  });
  return { owner, other, transaction };
}

function patch(id: string, status: string) {
  return updateTransactionStatus(
    new Request(`http://localhost/api/transactions/${id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("transaction status update", () => {
  it("alterna entre concluída, pendente e cancelada", async () => {
    const { owner, transaction } = await setup();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    for (const status of ["PENDING", "COMPLETED", "CANCELLED", "PENDING"] as const) {
      const response = await patch(transaction.id, status);
      expect(response.status).toBe(200);
      const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
      expect(stored.status).toBe(status);
    }
  });

  it("derruba a conferência ao sair de concluída", async () => {
    const { owner, transaction } = await setup({ reconciliationStatus: "CLEARED" });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    expect((await patch(transaction.id, "PENDING")).status).toBe(200);
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(stored).toMatchObject({ status: "PENDING", reconciliationStatus: "UNCLEARED" });
  });

  it("bloqueia reconciliada, outro usuário e valor inválido", async () => {
    const { owner, other, transaction } = await setup({
      reconciliationStatus: "RECONCILED",
      reconciledAt: new Date(),
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    expect((await patch(transaction.id, "PENDING")).status).toBe(409);
    expect((await patch(transaction.id, "INVALID")).status).toBe(400);

    authMocks.getAuthenticatedUserId.mockResolvedValue(other.id);
    expect((await patch(transaction.id, "PENDING")).status).toBe(404);

    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(stored.status).toBe("COMPLETED");
  });
});
