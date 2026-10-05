import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { withDerivedAccountBalance } from "@/app/lib/accounts/account-balance";
import { getCreditCardStatements } from "@/app/lib/cards/credit-card-statements-handler";
import { payCreditCardStatementForUser } from "@/app/lib/cards/pay-credit-card-statement";
import { getMonthlyDashboardForUser } from "@/app/lib/dashboard/monthly-dashboard";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function fixture() {
  const suffix = randomUUID();
  const [owner, other] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Card Payment Owner",
        email: `card-payment-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Card Payment Other",
        email: `card-payment-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  userIds.push(owner.id, other.id);

  const [card, source, usdSource, foreignSource] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Cartão ${suffix}`,
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Conta BRL ${suffix}`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Conta USD ${suffix}`,
        type: "CREDIT_DEBIT",
        currency: "USD",
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Conta externa ${suffix}`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: other.id,
      },
    }),
  ]);

  const category = await prisma.category.create({
    data: {
      name: `Compras ${suffix}`.slice(0, 50),
      type: "EXPENSE",
      userId: owner.id,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        amount: 25_000,
        year: 2026,
        month: 9,
        day: 4,
        type: "EXPENSE",
        kind: "NORMAL",
        description: "Compra da fatura",
        status: "COMPLETED",
        accountId: card.id,
        categoryId: category.id,
        userId: owner.id,
      },
      {
        amount: 10_000,
        year: 2026,
        month: 10,
        day: 1,
        type: "EXPENSE",
        kind: "NORMAL",
        description: "Compra futura",
        status: "PENDING",
        accountId: card.id,
        categoryId: category.id,
        userId: owner.id,
      },
    ],
  });

  return { owner, other, card, source, usdSource, foreignSource };
}

describe("credit card statement payment integration", () => {
  it("pays once, replays safely and does not double count expense", async () => {
    const { owner, card, source } = await fixture();

    const creditCategory = await prisma.category.create({
      data: {
        name: `Estornos ${randomUUID()}`.slice(0, 50),
        type: "INCOME",
        userId: owner.id,
      },
    });
    await prisma.transaction.create({
      data: {
        amount: 5_000,
        year: 2026,
        month: 9,
        day: 4,
        type: "INCOME",
        kind: "NORMAL",
        description: "Estorno da fatura",
        status: "COMPLETED",
        accountId: card.id,
        categoryId: creditCategory.id,
        userId: owner.id,
      },
    });

    const input = {
      sourceAccountId: source.id,
      statementClosingDate: "2026-09-05",
      paymentDate: "2026-09-05",
    };

    const first = await payCreditCardStatementForUser(
      owner.id,
      card.id,
      input,
      "payment-key-1",
    );
    const replay = await payCreditCardStatementForUser(
      owner.id,
      card.id,
      input,
      "payment-key-1",
    );

    expect(first).toMatchObject({ amount: 25_000, replayed: false });
    expect(replay).toMatchObject({
      id: first.id,
      amount: 25_000,
      sourceTransactionId: first.sourceTransactionId,
      replayed: true,
    });

    const [paymentCount, paymentTransaction, sourceBalance, dashboard] =
      await Promise.all([
        prisma.creditCardPayment.count({ where: { userId: owner.id } }),
        prisma.transaction.findUnique({
          where: { id: first.sourceTransactionId },
        }),
        withDerivedAccountBalance(source, owner.id),
        getMonthlyDashboardForUser(
          owner.id,
          { year: 2026, month: 9 },
          "BRL",
        ),
      ]);

    expect(paymentCount).toBe(1);
    expect(paymentTransaction).toMatchObject({
      amount: 25_000,
      kind: "CARD_PAYMENT",
      type: "EXPENSE",
      status: "COMPLETED",
      categoryId: null,
      accountId: source.id,
    });
    expect(sourceBalance.balance).toBe(-25_000);
    expect(dashboard.summary.expense).toBe(25_000);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const statementsResponse = await getCreditCardStatements(
      new Request(
        `http://localhost/api/cards/${card.id}/statements?asOf=2026-09-06&history=12`,
      ),
      { params: Promise.resolve({ id: card.id }) },
    );
    const statements = await statementsResponse.json();

    expect(statementsResponse.status).toBe(200);
    expect(statements.data.card).toMatchObject({
      creditLimit: 100_000,
      usedLimit: 10_000,
      availableLimit: 90_000,
      overLimit: 0,
    });
    expect(statements.data.history[0]).toMatchObject({
      closingDate: { year: 2026, month: 9, day: 5 },
      total: 25_000,
      status: "PAID",
      payment: {
        id: first.id,
        amount: 25_000,
        sourceAccountId: source.id,
      },
    });
  });

  it("rejects duplicate statement payment with another key", async () => {
    const { owner, card, source } = await fixture();
    const input = {
      sourceAccountId: source.id,
      statementClosingDate: "2026-09-05",
      paymentDate: "2026-09-05",
    };

    await payCreditCardStatementForUser(owner.id, card.id, input, "key-a");

    await expect(
      payCreditCardStatementForUser(owner.id, card.id, input, "key-b"),
    ).rejects.toMatchObject({
      status: 409,
      code: "CREDIT_CARD_STATEMENT_ALREADY_PAID",
    });
    expect(
      await prisma.transaction.count({
        where: { userId: owner.id, kind: "CARD_PAYMENT" },
      }),
    ).toBe(1);
  });

  it("rejects foreign and incompatible-currency source accounts", async () => {
    const { owner, card, usdSource, foreignSource } = await fixture();
    const base = {
      statementClosingDate: "2026-09-05",
      paymentDate: "2026-09-05",
    };

    await expect(
      payCreditCardStatementForUser(
        owner.id,
        card.id,
        { ...base, sourceAccountId: foreignSource.id },
        "foreign-source",
      ),
    ).rejects.toBeInstanceOf(HttpError);

    await expect(
      payCreditCardStatementForUser(
        owner.id,
        card.id,
        { ...base, sourceAccountId: usdSource.id },
        "wrong-currency",
      ),
    ).rejects.toMatchObject({
      status: 400,
      code: "CREDIT_CARD_PAYMENT_CURRENCY_MISMATCH",
    });

    expect(await prisma.creditCardPayment.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("locks structural card fields after financial movements", async () => {
    const { owner, card } = await fixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const { accountCrud } = await import("@/app/lib/accounts/account-crud");
    const response = await accountCrud.update(
      new Request(`http://localhost/api/accounts/${card.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statementClosingDay: 8 }),
      }),
      { params: Promise.resolve({ id: card.id }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CREDIT_CARD_STRUCTURE_LOCKED");
  });

  it("makes purchases in a paid statement immutable", async () => {
    const { owner, card, source } = await fixture();
    await payCreditCardStatementForUser(
      owner.id,
      card.id,
      {
        sourceAccountId: source.id,
        statementClosingDate: "2026-09-05",
        paymentDate: "2026-09-06",
      },
      "immutable-key",
    );

    const purchase = await prisma.transaction.findFirstOrThrow({
      where: {
        userId: owner.id,
        accountId: card.id,
        description: "Compra da fatura",
      },
    });

    const { transactionCrud } = await import(
      "@/app/lib/transactions/transaction-crud"
    );
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${purchase.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: 31_000 }),
      }),
      { params: Promise.resolve({ id: purchase.id }) },
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("CREDIT_CARD_STATEMENT_PAID");
  });
});
