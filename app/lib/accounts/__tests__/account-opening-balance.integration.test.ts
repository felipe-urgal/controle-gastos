import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { accountCrud } from "@/app/lib/accounts/account-crud";
import { getAccountActivity } from "@/app/lib/accounts/account-activity";
import { logicalDateFromUtcInstant } from "@/app/lib/date/logical-date";
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

async function createOwner() {
  const suffix = randomUUID();
  const owner = await prisma.user.create({
    data: {
      name: "Opening Balance Owner",
      email: `opening-balance-${suffix}@example.com`,
      password: "test-hash",
    },
  });
  createdUserIds.push(owner.id);
  authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
  return { owner, suffix };
}

function createAccount(body: Record<string, unknown>) {
  return accountCrud.create(
    new Request("http://localhost/api/accounts", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("account opening balance", () => {
  it("creates the account with an opening transaction that counts in the balance only", async () => {
    const { owner, suffix } = await createOwner();

    const response = await createAccount({
      name: `Conta ${suffix}`,
      type: "CREDIT_DEBIT",
      description: null,
      openingBalance: 150_000,
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.balance).toBe(150_000);

    const opening = await prisma.transaction.findMany({ where: { accountId: body.data.id } });
    expect(opening).toHaveLength(1);
    expect(opening[0]).toMatchObject({
      kind: "OPENING_BALANCE",
      status: "COMPLETED",
      type: "INCOME",
      amount: 150_000,
      categoryId: null,
      userId: owner.id,
    });

    // Saldo inicial não é "entrou no mês", mas aparece na evolução do saldo.
    const activity = await getAccountActivity({
      userId: owner.id,
      accountId: body.data.id,
      currentBalance: body.data.balance,
      asOf: logicalDateFromUtcInstant(new Date()),
    });
    expect(activity.monthIncome).toBe(0);
    expect(activity.monthExpense).toBe(0);
    expect(activity.balanceSeries.at(-1)).toBe(150_000);
  });

  it("stores a negative opening balance as an expense and leaves zero without a transaction", async () => {
    const { suffix } = await createOwner();

    const negative = await (await createAccount({ name: `Neg ${suffix}`, type: "CREDIT_DEBIT", description: null, openingBalance: -2_500 })).json();
    expect(negative.data.balance).toBe(-2_500);
    const [expense] = await prisma.transaction.findMany({ where: { accountId: negative.data.id } });
    expect(expense).toMatchObject({ kind: "OPENING_BALANCE", type: "EXPENSE", amount: 2_500 });

    const zero = await (await createAccount({ name: `Zero ${suffix}`, type: "CREDIT_DEBIT", description: null, openingBalance: 0 })).json();
    expect(zero.data.balance).toBe(0);
    expect(await prisma.transaction.count({ where: { accountId: zero.data.id } })).toBe(0);
  });

  it("rejects an opening balance on credit cards", async () => {
    const { suffix } = await createOwner();

    const response = await createAccount({
      name: `Cartão ${suffix}`,
      type: "CREDIT_CARD",
      description: null,
      creditLimit: 500_000,
      statementClosingDay: 5,
      statementDueDay: 12,
      openingBalance: 1_000,
    });

    expect(response.status).toBe(400);
  });

  it("does not let the transaction endpoints change or remove the opening balance", async () => {
    const { suffix } = await createOwner();
    const account = (await (await createAccount({ name: `Bloq ${suffix}`, type: "CREDIT_DEBIT", description: null, openingBalance: 9_900 })).json()).data;
    const [opening] = await prisma.transaction.findMany({ where: { accountId: account.id } });

    const response = await transactionCrud.remove(
      new Request(`http://localhost/api/transactions/${opening.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: opening.id }) },
    );

    expect(response.status).toBe(400);
    expect(await prisma.transaction.count({ where: { id: opening.id } })).toBe(1);
  });

  it("deletes an account whose only history is the opening balance, but not one with movements", async () => {
    const { owner, suffix } = await createOwner();
    const category = await prisma.category.create({
      data: { name: `Cat ${suffix}`, type: "EXPENSE", userId: owner.id },
    });

    const onlyOpening = (await (await createAccount({ name: `Só abertura ${suffix}`, type: "CREDIT_DEBIT", description: null, openingBalance: 5_000 })).json()).data;
    expect(onlyOpening.isDeletable).toBe(true);
    const removed = await accountCrud.remove(
      new Request(`http://localhost/api/accounts/${onlyOpening.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: onlyOpening.id }) },
    );
    expect(removed.status).toBe(200);
    expect(await prisma.account.count({ where: { id: onlyOpening.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { accountId: onlyOpening.id } })).toBe(0);

    const withMovement = (await (await createAccount({ name: `Com mov ${suffix}`, type: "CREDIT_DEBIT", description: null, openingBalance: 5_000 })).json()).data;
    await prisma.transaction.create({
      data: {
        amount: 1_000, type: "EXPENSE", kind: "NORMAL", status: "COMPLETED", description: "Compra",
        year: 2026, month: 10, day: 1, accountId: withMovement.id, categoryId: category.id, userId: owner.id,
      },
    });
    const blocked = await accountCrud.remove(
      new Request(`http://localhost/api/accounts/${withMovement.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: withMovement.id }) },
    );
    expect(blocked.status).toBe(409);
    expect(await prisma.account.count({ where: { id: withMovement.id } })).toBe(1);
  });
});
