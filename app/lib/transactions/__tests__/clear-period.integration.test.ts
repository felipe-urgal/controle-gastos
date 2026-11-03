import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/security/application-rate-limit", () => ({
  consumeTransactionMutationRateLimit: vi.fn().mockResolvedValue({ limited: false }),
}));

import { payCreditCardStatementForUser } from "@/app/lib/cards/pay-credit-card-statement";
import { prisma } from "@/app/lib/prisma";
import { createTransferForUser } from "@/app/lib/transfers/create-transfer";
import { clearPeriod, previewClearPeriod } from "@/app/lib/transactions/clear-period";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function clearRequest(body: unknown) {
  return new Request("http://localhost/api/transactions/period", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function previewRequest(query: string) {
  return new Request(`http://localhost/api/transactions/period?${query}`);
}

describe("clear period", () => {
  it("deletes everything in the owner's period except opening balance", async () => {
    const user = await fixtures.user({ name: "Clear month owner" });
    const other = await fixtures.user({ name: "Clear month other" });
    const [account, otherAccount] = await Promise.all([
      fixtures.account(user.id, { name: "Conta limpar", currency: "BRL" }),
      fixtures.account(other.id, { name: "Conta alheia", currency: "BRL" }),
    ]);
    const [category, otherCategory] = await Promise.all([
      fixtures.category(user.id, { name: "Cat limpar", type: "EXPENSE" }),
      fixtures.category(other.id, { name: "Cat alheia", type: "EXPENSE" }),
    ]);
    const base = { year: 2026, month: 10, day: 5 };

    await fixtures.transaction({ userId: user.id, accountId: account.id, categoryId: category.id, overrides: { ...base, description: "apagar 1" } });
    await fixtures.transaction({ userId: user.id, accountId: account.id, categoryId: category.id, overrides: { ...base, description: "apagar 2", status: "PENDING" } });
    await fixtures.transaction({
      userId: user.id,
      accountId: account.id,
      categoryId: category.id,
      overrides: { ...base, description: "conciliada", reconciliationStatus: "RECONCILED", reconciledAt: new Date() },
    });
    await fixtures.transaction({ userId: user.id, accountId: account.id, overrides: { ...base, description: "saldo inicial", kind: "OPENING_BALANCE" } });
    await fixtures.transaction({ userId: user.id, accountId: account.id, categoryId: category.id, overrides: { ...base, month: 11, description: "outro mês" } });
    await fixtures.transaction({ userId: other.id, accountId: otherAccount.id, categoryId: otherCategory.id, overrides: { ...base, description: "de outro usuário" } });

    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const previewBody = await (await previewClearPeriod(previewRequest("from=2026-10-01&to=2026-10-31"))).json();
    expect(previewBody.data).toEqual({
      deletable: 3,
      breakdown: { normal: 3, transfers: 0, cardPayments: 0, reconciled: 1 },
      kept: { openingBalance: 1 },
    });

    const stale = await clearPeriod(clearRequest({ from: "2026-10-01", to: "2026-10-31", expectedCount: 5 }));
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("CLEAR_PERIOD_COUNT_MISMATCH");
    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(5);

    const response = await clearPeriod(clearRequest({ from: "2026-10-01", to: "2026-10-31", expectedCount: 3 }));
    expect(response.status).toBe(200);
    expect((await response.json()).data.deleted).toBe(3);

    const remaining = await prisma.transaction.findMany({
      where: { userId: user.id },
      select: { description: true },
      orderBy: { description: "asc" },
    });
    expect(remaining.map((row) => row.description)).toEqual(["outro mês", "saldo inicial"]);
    expect(await prisma.transaction.count({ where: { userId: other.id } })).toBe(1);
  });

  it("respects the account filter and rejects accounts of other users", async () => {
    const user = await fixtures.user({ name: "Clear month account" });
    const other = await fixtures.user({ name: "Clear month account other" });
    const [first, second, foreign] = await Promise.all([
      fixtures.account(user.id, { name: "Conta A", currency: "BRL" }),
      fixtures.account(user.id, { name: "Conta B", currency: "BRL" }),
      fixtures.account(other.id, { name: "Conta C", currency: "BRL" }),
    ]);
    const category = await fixtures.category(user.id, { name: "Cat filtro", type: "EXPENSE" });
    const base = { year: 2026, month: 10, day: 5 };
    await fixtures.transaction({ userId: user.id, accountId: first.id, categoryId: category.id, overrides: base });
    await fixtures.transaction({ userId: user.id, accountId: second.id, categoryId: category.id, overrides: base });

    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const foreignResponse = await clearPeriod(
      clearRequest({ from: "2026-10-01", to: "2026-10-31", accountId: foreign.id, expectedCount: 0 }),
    );
    expect(foreignResponse.status).toBe(404);

    const response = await clearPeriod(
      clearRequest({ from: "2026-10-01", to: "2026-10-31", accountId: first.id, expectedCount: 1 }),
    );
    expect(response.status).toBe(200);
    expect(await prisma.transaction.count({ where: { userId: user.id, accountId: second.id } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: user.id, accountId: first.id } })).toBe(0);
  });

  it("removes paid statement purchases, the card payment record and transfers", async () => {
    const user = await fixtures.user({ name: "Clear month card" });
    const [card, source] = await Promise.all([
      fixtures.account(user.id, {
        name: "Cartão",
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 20,
        statementDueDay: 27,
      }),
      fixtures.account(user.id, { name: "Pagadora", currency: "BRL" }),
    ]);

    const category = await fixtures.category(user.id, { name: "Cat cartão", type: "EXPENSE" });
    await fixtures.transaction({
      userId: user.id,
      accountId: card.id,
      categoryId: category.id,
      overrides: { year: 2026, month: 9, day: 15, description: "fatura paga" },
    });
    await payCreditCardStatementForUser(
      user.id,
      card.id,
      { sourceAccountId: source.id, statementClosingDate: "2026-09-20", paymentDate: "2026-09-20" },
      "clear-period-paid-statement",
    );
    await fixtures.transaction({
      userId: user.id,
      accountId: card.id,
      categoryId: category.id,
      overrides: { year: 2026, month: 9, day: 25, description: "próxima fatura" },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const poup = await fixtures.account(user.id, { name: "Poupança", currency: "BRL" });
    await createTransferForUser(
      user.id,
      { sourceAccountId: source.id, destinationAccountId: poup.id, amountCents: 5_000, year: 2026, month: 9, day: 22, description: "Reserva", status: "COMPLETED" },
      "clear-period-transfer",
    );

    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const preview = await (await previewClearPeriod(previewRequest("from=2026-09-01&to=2026-09-30"))).json();
    expect(preview.data).toMatchObject({
      deletable: 5,
      breakdown: { normal: 2, transfers: 1, cardPayments: 1 },
    });

    const response = await clearPeriod(clearRequest({ from: "2026-09-01", to: "2026-09-30", expectedCount: 5 }));
    expect(response.status).toBe(200);

    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.creditCardPayment.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.transfer.count({ where: { userId: user.id, deletedAt: null } })).toBe(0);
  });

  it("clears a multi-month custom range with inclusive boundaries", async () => {
    const user = await fixtures.user({ name: "Clear period range" });
    const account = await fixtures.account(user.id, { name: "Conta range", currency: "BRL" });
    const category = await fixtures.category(user.id, { name: "Cat range", type: "EXPENSE" });
    const dates: Array<[number, number, number, string]> = [
      [2026, 4, 30, "antes"],
      [2026, 5, 1, "início"],
      [2026, 8, 15, "meio"],
      [2026, 10, 31, "fim"],
      [2026, 11, 1, "depois"],
    ];
    for (const [year, month, day, description] of dates) {
      await fixtures.transaction({
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        overrides: { year, month, day, description },
      });
    }
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const preview = await (await previewClearPeriod(previewRequest("from=2026-05-01&to=2026-10-31"))).json();
    expect(preview.data.deletable).toBe(3);

    const response = await clearPeriod(clearRequest({ from: "2026-05-01", to: "2026-10-31", expectedCount: 3 }));
    expect(response.status).toBe(200);
    const left = await prisma.transaction.findMany({
      where: { userId: user.id },
      select: { description: true },
      orderBy: { description: "asc" },
    });
    expect(left.map((row) => row.description)).toEqual(["antes", "depois"]);

    const inverted = await clearPeriod(clearRequest({ from: "2026-10-31", to: "2026-05-01", expectedCount: 0 }));
    expect(inverted.status).toBe(400);
  });

  it("rejects invalid input and unauthenticated calls", async () => {
    const user = await fixtures.user({ name: "Clear month invalid" });
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);
    expect((await clearPeriod(clearRequest({ from: "2026-13-01", to: "2026-13-31", expectedCount: 0 }))).status).toBe(400);
    expect((await clearPeriod(clearRequest({ from: "2026-01-01", to: "2026-01-31" }))).status).toBe(400);
    expect((await previewClearPeriod(previewRequest("from=abc"))).status).toBe(400);
  });
});
