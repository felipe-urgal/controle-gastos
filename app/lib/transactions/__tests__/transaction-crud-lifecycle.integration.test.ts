import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { payCreditCardStatementForUser } from "@/app/lib/cards/pay-credit-card-statement";
import { prisma } from "@/app/lib/prisma";
import { transactionCrud } from "@/app/lib/transactions/transaction-crud";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("normal transaction CRUD lifecycle", () => {
  it("rejects creating a purchase inside an already paid card statement", async () => {
    const user = await fixtures.user({ name: "Paid statement owner" });
    const [card, source, category] = await Promise.all([
      fixtures.account(user.id, {
        name: "Cartão pago",
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 20,
        statementDueDay: 27,
      }),
      fixtures.account(user.id, { name: "Conta pagadora", currency: "BRL" }),
      fixtures.category(user.id, { name: "Compras cartão", type: "EXPENSE" }),
    ]);

    await fixtures.transaction({
      userId: user.id,
      accountId: card.id,
      categoryId: category.id,
      overrides: {
        amount: 10_000,
        year: 2030,
        month: 6,
        day: 15,
        type: "EXPENSE",
        status: "COMPLETED",
        description: "Compra original",
      },
    });

    await payCreditCardStatementForUser(
      user.id,
      card.id,
      {
        sourceAccountId: source.id,
        statementClosingDate: "2030-06-20",
        paymentDate: "2030-06-20",
      },
      "paid-statement-create-guard",
    );

    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
    const before = await prisma.transaction.count({
      where: { userId: user.id, accountId: card.id, kind: "NORMAL" },
    });

    const response = await transactionCrud.create(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: 2_500,
          description: "Compra tardia",
          status: "COMPLETED",
          year: 2030,
          month: 6,
          day: 16,
          accountId: card.id,
          categoryId: category.id,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CREDIT_CARD_STATEMENT_PAID");
    expect(
      await prisma.transaction.count({
        where: { userId: user.id, accountId: card.id, kind: "NORMAL" },
      }),
    ).toBe(before);
  });

  it("creates, updates and deletes a normal owned transaction", async () => {
    const user = await fixtures.user({ name: "Transaction CRUD Owner" });

    const [account, category] = await Promise.all([
      fixtures.account(user.id, { name: "Conta CRUD", currency: "BRL" }),
      fixtures.category(user.id, { name: "Despesa CRUD", type: "EXPENSE" }),
    ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const createResponse = await transactionCrud.create(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: 12_345,
          type: "INCOME",
          description: "Compra planejada",
          status: "PENDING",
          year: 2030,
          month: 6,
          day: 15,
          accountId: account.id,
          categoryId: category.id,
        }),
      }),
    );

    expect(createResponse.status).toBe(201);

    const created = await prisma.transaction.findFirst({
      where: { userId: user.id, description: "Compra planejada" },
    });
    expect(created).toMatchObject({
      amount: 12_345,
      description: "Compra planejada",
      status: "PENDING",
      type: "EXPENSE",
      kind: "NORMAL",
      accountId: account.id,
      categoryId: category.id,
      userId: user.id,
    });

    const transactionId = created!.id;
    const updateResponse = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${transactionId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: 10_000,
          description: "Compra ajustada",
          status: "COMPLETED",
        }),
      }),
      { params: Promise.resolve({ id: transactionId }) },
    );

    expect(updateResponse.status).toBe(200);
    expect(
      await prisma.transaction.findUnique({ where: { id: transactionId } }),
    ).toMatchObject({
      amount: 10_000,
      description: "Compra ajustada",
      status: "COMPLETED",
      type: "EXPENSE",
      accountId: account.id,
      categoryId: category.id,
      userId: user.id,
    });

    const deleteResponse = await transactionCrud.remove(
      new Request(`http://localhost/api/transactions/${transactionId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: transactionId }) },
    );

    expect(deleteResponse.status).toBe(200);
    expect(
      await prisma.transaction.findUnique({ where: { id: transactionId } }),
    ).toBeNull();
  });
});
