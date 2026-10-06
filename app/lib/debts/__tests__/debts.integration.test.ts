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

function jsonRequest(
  url: string,
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", ...headers },
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
    expect(body.data.adjustmentCount).toBe(1);

    const detailResponse = await getDebt(
      new Request(`http://localhost/api/debts/${body.data.id}`),
      { params: Promise.resolve({ id: body.data.id }) },
    );
    const detail = (await detailResponse.json()).data;

    expect(detail.adjustments).toHaveLength(1);
    expect(detail.adjustments[0]).toMatchObject({
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
      jsonRequest(
        `http://localhost/api/debts/${debt.id}/pay`,
        "POST",
        { amount: 70_000 },
        { "Idempotency-Key": "settle-debt-1" },
      ),
      { params: Promise.resolve({ id: debt.id }) },
    );
    const paid = (await payResponse.json()).data;

    expect(paid).toMatchObject({ balance: 0, status: "PAID" });

    const detailResponse = await getDebt(
      new Request(`http://localhost/api/debts/${debt.id}`),
      { params: Promise.resolve({ id: debt.id }) },
    );
    const detail = (await detailResponse.json()).data;

    expect(detail.adjustments).toHaveLength(3);
    expect(detail.adjustments).toEqual(
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

  it("advances one monthly installment atomically without creating a transaction", async () => {
    const owner = await fixtures.user({ name: "Debt Payment Owner" });
    const createdResponse = await createThroughApi(owner.id);
    const debt = (await createdResponse.json()).data;
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const transactionCount = await prisma.transaction.count({
      where: { userId: owner.id },
    });
    const response = await payDebt(
      jsonRequest(
        `http://localhost/api/debts/${debt.id}/pay`,
        "POST",
        { amount: 10_000, description: "Parcela outubro" },
        { "Idempotency-Key": "installment-1" },
      ),
      { params: Promise.resolve({ id: debt.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      balance: 90_000,
      status: "ACTIVE",
      installmentAmount: 10_000,
      dueDate: "2026-11-10",
      remainingInstallments: 9,
    });
    expect(
      await prisma.transaction.count({ where: { userId: owner.id } }),
    ).toBe(transactionCount);

    const payment = await prisma.debtAdjustment.findFirstOrThrow({
      where: { userId: owner.id, debtId: debt.id, kind: "PAYMENT" },
    });
    expect(payment).toMatchObject({
      previousBalance: 100_000,
      newBalance: 90_000,
      delta: -10_000,
    });
  });

  it("replays the same debt payment once and rejects payload reuse", async () => {
    const owner = await fixtures.user({ name: "Debt Idempotency Owner" });
    const createdResponse = await createThroughApi(owner.id);
    const debt = (await createdResponse.json()).data;
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const makeRequest = (amount: number) =>
      payDebt(
        jsonRequest(
          `http://localhost/api/debts/${debt.id}/pay`,
          "POST",
          { amount },
          { "Idempotency-Key": "same-payment" },
        ),
        { params: Promise.resolve({ id: debt.id }) },
      );

    const first = await makeRequest(10_000);
    const replay = await makeRequest(10_000);
    const conflict = await makeRequest(20_000);

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(conflict.status).toBe(409);

    const persisted = await prisma.debt.findUniqueOrThrow({
      where: { id: debt.id },
    });
    expect(persisted).toMatchObject({
      balance: 90_000,
      remainingInstallments: 9,
      dueYear: 2026,
      dueMonth: 11,
      dueDay: 10,
    });
    expect(
      await prisma.debtAdjustment.count({
        where: { userId: owner.id, debtId: debt.id, kind: "PAYMENT" },
      }),
    ).toBe(1);
  });

  it("clears future schedule when the last installment settles the debt", async () => {
    const owner = await fixtures.user({ name: "Debt Last Installment Owner" });
    const createdResponse = await createThroughApi(owner.id, {
      balance: 10_000,
      installmentAmount: 10_000,
      remainingInstallments: 1,
    });
    const debt = (await createdResponse.json()).data;
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await payDebt(
      jsonRequest(
        `http://localhost/api/debts/${debt.id}/pay`,
        "POST",
        { amount: 10_000 },
        { "Idempotency-Key": "last-installment" },
      ),
      { params: Promise.resolve({ id: debt.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      balance: 0,
      status: "PAID",
      installmentAmount: null,
      dueDate: null,
      remainingInstallments: null,
    });
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
