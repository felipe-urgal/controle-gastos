import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  adjustDebt,
  createDebt,
  getDebt,
  payDebt,
  removeDebt,
  updateDebt,
} from "@/app/lib/debts/debts";
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

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createThroughApi(userId: string, overrides: Record<string, unknown> = {}) {
  authMocks.getAuthenticatedUserId.mockResolvedValue(userId);
  return createDebt(
    jsonRequest("http://localhost/api/debts", "POST", {
      name: "Financiamento",
      currency: "BRL",
      balance: 100_000,
      installmentAmount: 10_000,
      dueDate: "2026-10-10",
      remainingInstallments: 10,
      institution: "Banco",
      ...overrides,
    }),
  );
}

describe("debts integration", () => {
  it("creates a passivo separado de contas e registra o saldo inicial", async () => {
    const owner = await fixtures.user({ name: "Debt Owner" });
    const response = await createThroughApi(owner.id);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      name: "Financiamento",
      balance: 100_000,
      currency: "BRL",
      status: "ACTIVE",
      dueDate: "2026-10-10",
    });
    expect(body.data.adjustments).toHaveLength(1);
    expect(body.data.adjustments[0]).toMatchObject({
      previousBalance: 0,
      newBalance: 100_000,
      delta: 100_000,
      description: "Saldo inicial",
    });
    expect(await prisma.account.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("does not reveal or mutate another user's debt", async () => {
    const [owner, other] = await Promise.all([
      fixtures.user({ name: "Debt Owner" }),
      fixtures.user({ name: "Debt Other" }),
    ]);

    const foreign = await prisma.debt.create({
      data: {
        userId: other.id,
        name: "Dívida externa",
        currency: "BRL",
        balance: 25_000,
        adjustments: {
          create: {
            userId: other.id,
            previousBalance: 0,
            newBalance: 25_000,
            delta: 25_000,
            description: "Saldo inicial",
          },
        },
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const getResponse = await getDebt(
      new Request(`http://localhost/api/debts/${foreign.id}`),
      { params: Promise.resolve({ id: foreign.id }) },
    );
    expect(getResponse.status).toBe(404);

    const adjustResponse = await adjustDebt(
      jsonRequest(`http://localhost/api/debts/${foreign.id}/adjustments`, "POST", {
        newBalance: 1,
      }),
      { params: Promise.resolve({ id: foreign.id }) },
    );
    expect(adjustResponse.status).toBe(404);

    const deleteResponse = await removeDebt(
      new Request(`http://localhost/api/debts/${foreign.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: foreign.id }) },
    );
    expect(deleteResponse.status).toBe(404);

    expect((await prisma.debt.findUniqueOrThrow({ where: { id: foreign.id } })).balance).toBe(25_000);
  });

  it("preserves every balance change and marks the debt as paid", async () => {
    const owner = await fixtures.user({ name: "Debt Owner" });
    const createdResponse = await createThroughApi(owner.id);
    const debt = (await createdResponse.json()).data;

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const adjustmentResponse = await adjustDebt(
      jsonRequest(`http://localhost/api/debts/${debt.id}/adjustments`, "POST", {
        newBalance: 70_000,
        description: "Pagamento de três parcelas",
      }),
      { params: Promise.resolve({ id: debt.id }) },
    );
    expect(adjustmentResponse.status).toBe(200);

    const payResponse = await payDebt(
      new Request(`http://localhost/api/debts/${debt.id}/pay`, { method: "POST" }),
      { params: Promise.resolve({ id: debt.id }) },
    );
    const paid = (await payResponse.json()).data;

    expect(paid).toMatchObject({ balance: 0, status: "PAID" });
    expect(paid.adjustments).toHaveLength(3);
    expect(paid.adjustments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          previousBalance: 100_000,
          newBalance: 70_000,
          delta: -30_000,
        }),
        expect.objectContaining({
          previousBalance: 70_000,
          newBalance: 0,
          delta: -70_000,
          description: "Quitação",
        }),
      ]),
    );
  });

  it("only archives zero-balance debts and protects adjusted history from deletion", async () => {
    const owner = await fixtures.user({ name: "Debt Owner" });
    const createdResponse = await createThroughApi(owner.id);
    const debt = (await createdResponse.json()).data;
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const archiveActive = await updateDebt(
      jsonRequest(`http://localhost/api/debts/${debt.id}`, "PUT", { status: "ARCHIVED" }),
      { params: Promise.resolve({ id: debt.id }) },
    );
    expect(archiveActive.status).toBe(409);

    await adjustDebt(
      jsonRequest(`http://localhost/api/debts/${debt.id}/adjustments`, "POST", {
        newBalance: 90_000,
        description: "Ajuste",
      }),
      { params: Promise.resolve({ id: debt.id }) },
    );

    const deleteResponse = await removeDebt(
      new Request(`http://localhost/api/debts/${debt.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: debt.id }) },
    );
    expect(deleteResponse.status).toBe(409);
  });

  it("allows only one concurrent adjustment from the same previous balance", async () => {
    const owner = await fixtures.user({ name: "Debt Concurrent Owner" });
    const createdResponse = await createThroughApi(owner.id);
    const debt = (await createdResponse.json()).data;
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const [first, second] = await Promise.all([
      adjustDebt(
        jsonRequest(`http://localhost/api/debts/${debt.id}/adjustments`, "POST", {
          newBalance: 80_000,
          description: "Ajuste A",
        }),
        { params: Promise.resolve({ id: debt.id }) },
      ),
      adjustDebt(
        jsonRequest(`http://localhost/api/debts/${debt.id}/adjustments`, "POST", {
          newBalance: 70_000,
          description: "Ajuste B",
        }),
        { params: Promise.resolve({ id: debt.id }) },
      ),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);

    const persisted = await prisma.debt.findUniqueOrThrow({
      where: { id: debt.id },
      include: { adjustments: true },
    });
    expect([70_000, 80_000]).toContain(persisted.balance);
    expect(persisted.adjustments).toHaveLength(2);
  });

});
