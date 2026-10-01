import { afterAll, afterEach, describe, expect, it } from "vitest";

import {
  getForecastForUser,
  logicalDateFromUtcInstant,
} from "@/app/lib/forecast/forecast";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createForecastFixture() {
  const [owner, otherUser] = await Promise.all([
    fixtures.user({ name: "Forecast Owner" }),
    fixtures.user({ name: "Forecast Other" }),
  ]);

  const [brlAccount, usdAccount, inactiveBrlAccount, otherAccount] =
    await Promise.all([
      fixtures.account(owner.id, {
        name: "Forecast BRL",
        currency: "BRL",
      }),
      fixtures.account(owner.id, {
        name: "Forecast USD",
        currency: "USD",
      }),
      fixtures.account(owner.id, {
        name: "Forecast inactive",
        currency: "BRL",
        isActive: false,
      }),
      fixtures.account(otherUser.id, {
        name: "Forecast foreign",
        currency: "BRL",
      }),
    ]);

  const [ownerIncome, ownerExpense, otherExpense] = await Promise.all([
    fixtures.category(owner.id, {
      name: "Forecast receita",
      type: "INCOME",
    }),
    fixtures.category(owner.id, {
      name: "Forecast despesa",
      type: "EXPENSE",
    }),
    fixtures.category(otherUser.id, {
      name: "Forecast externa",
      type: "EXPENSE",
    }),
  ]);

  await prisma.transaction.createMany({
    data: [
      {
        amount: 100_000,
        year: 2028,
        month: 4,
        day: 1,
        type: "INCOME",
        description: "Saldo realizado",
        status: "COMPLETED",
        accountId: brlAccount.id,
        categoryId: ownerIncome.id,
        userId: owner.id,
      },
      {
        amount: 20_000,
        year: 2028,
        month: 4,
        day: 2,
        type: "EXPENSE",
        description: "Despesa realizada",
        status: "COMPLETED",
        accountId: brlAccount.id,
        categoryId: ownerExpense.id,
        userId: owner.id,
      },
      {
        amount: 5_000,
        year: 2028,
        month: 4,
        day: 9,
        type: "EXPENSE",
        description: "Pendente vencida",
        status: "PENDING",
        accountId: brlAccount.id,
        categoryId: ownerExpense.id,
        userId: owner.id,
      },
      {
        amount: 10_000,
        year: 2028,
        month: 4,
        day: 15,
        type: "INCOME",
        description: "Entrada futura",
        status: "PENDING",
        accountId: brlAccount.id,
        categoryId: ownerIncome.id,
        userId: owner.id,
      },
      {
        amount: 30_000,
        year: 2028,
        month: 4,
        day: 20,
        type: "EXPENSE",
        description: "Saída futura",
        status: "PENDING",
        accountId: brlAccount.id,
        categoryId: ownerExpense.id,
        userId: owner.id,
      },
      {
        amount: 99_000,
        year: 2028,
        month: 5,
        day: 10,
        type: "EXPENSE",
        description: "Fora do horizonte",
        status: "PENDING",
        accountId: brlAccount.id,
        categoryId: ownerExpense.id,
        userId: owner.id,
      },
      {
        amount: 88_000,
        year: 2028,
        month: 4,
        day: 18,
        type: "EXPENSE",
        description: "Cancelada",
        status: "CANCELLED",
        accountId: brlAccount.id,
        categoryId: ownerExpense.id,
        userId: owner.id,
      },
      {
        amount: 77_000,
        year: 2028,
        month: 4,
        day: 18,
        type: "EXPENSE",
        description: "Outra moeda",
        status: "PENDING",
        accountId: usdAccount.id,
        categoryId: ownerExpense.id,
        userId: owner.id,
      },
      {
        amount: 66_000,
        year: 2028,
        month: 4,
        day: 18,
        type: "EXPENSE",
        description: "Conta inativa",
        status: "PENDING",
        accountId: inactiveBrlAccount.id,
        categoryId: ownerExpense.id,
        userId: owner.id,
      },
      {
        amount: 999_000,
        year: 2028,
        month: 4,
        day: 18,
        type: "EXPENSE",
        description: "Outro usuário",
        status: "PENDING",
        accountId: otherAccount.id,
        categoryId: otherExpense.id,
        userId: otherUser.id,
      },
    ],
  });

  return { owner, brlAccount, usdAccount, inactiveBrlAccount };
}

describe("forecast integration", () => {
  it("derives realized balance and projects only owned active accounts in the selected currency", async () => {
    const { owner, brlAccount, usdAccount, inactiveBrlAccount } =
      await createForecastFixture();
    const transactionCountBefore = await prisma.transaction.count({
      where: { userId: owner.id },
    });

    const result = await getForecastForUser(
      owner.id,
      { currency: "BRL", days: 30 },
      new Date("2028-04-10T23:30:00.000Z")
    );

    expect(result.currency).toBe("BRL");
    expect(result.asOf).toEqual({ year: 2028, month: 4, day: 10 });
    expect(result.horizonEnd).toEqual({ year: 2028, month: 5, day: 9 });
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]).toMatchObject({
      id: brlAccount.id,
      realizedBalance: 80_000,
      pendingIncome: 10_000,
      pendingExpense: 30_000,
      projectedBalance: 60_000,
      lowestProjectedBalance: 60_000,
    });
    expect(result.overdue.map((item) => item.description)).toEqual([
      "Pendente vencida",
    ]);
    expect(result.safeToSpend).toMatchObject({
      realizedBalance: 80_000,
      pendingExpenses: 35_000,
      cardCommitments: 0,
      transferNet: 0,
      safeToSpend: 45_000,
    });
    expect(result.accounts.map((account) => account.id)).not.toContain(usdAccount.id);
    expect(result.accounts.map((account) => account.id)).not.toContain(
      inactiveBrlAccount.id
    );
    expect(
      await prisma.transaction.count({ where: { userId: owner.id } })
    ).toBe(transactionCountBefore);
  });

  it("keeps card purchases out of cash accounts and exposes each open statement once", async () => {
    const { owner } = await createForecastFixture();

    const [card, expenseCategory] = await Promise.all([
      prisma.account.create({
        data: {
          name: "Forecast Card",
          type: "CREDIT_CARD",
          currency: "BRL",
          creditLimit: 200_000,
          statementClosingDay: 5,
          statementDueDay: 12,
          userId: owner.id,
        },
      }),
      prisma.category.findFirstOrThrow({
        where: { userId: owner.id, type: "EXPENSE" },
      }),
    ]);

    await prisma.transaction.createMany({
      data: [
        {
          amount: 12_000,
          year: 2028,
          month: 4,
          day: 4,
          type: "EXPENSE",
          description: "Compra cartão atual",
          status: "COMPLETED",
          accountId: card.id,
          categoryId: expenseCategory.id,
          userId: owner.id,
        },
        {
          amount: 8_000,
          year: 2028,
          month: 5,
          day: 4,
          type: "EXPENSE",
          description: "Parcela futura cartão",
          status: "PENDING",
          accountId: card.id,
          categoryId: expenseCategory.id,
          userId: owner.id,
        },
      ],
    });

    const result = await getForecastForUser(
      owner.id,
      { currency: "BRL", days: 60 },
      new Date("2028-04-10T12:00:00.000Z"),
    );

    expect(result.accounts.map((account) => account.id)).not.toContain(card.id);
    expect(result.upcoming.map((item) => item.description)).not.toContain(
      "Parcela futura cartão",
    );
    expect(result.cardCommitments.overdue).toEqual([]);
    expect(result.cardCommitments.upcoming).toEqual([
      expect.objectContaining({
        cardId: card.id,
        amount: 12_000,
        closingDate: { year: 2028, month: 4, day: 5 },
        dueDate: { year: 2028, month: 4, day: 12 },
        transactionCount: 1,
      }),
      expect.objectContaining({
        cardId: card.id,
        amount: 8_000,
        closingDate: { year: 2028, month: 5, day: 5 },
        dueDate: { year: 2028, month: 5, day: 12 },
        transactionCount: 1,
      }),
    ]);
  });

  it("does not expose a paid card statement as a forecast commitment", async () => {
    const { owner, brlAccount } = await createForecastFixture();
    const expenseCategory = await prisma.category.findFirstOrThrow({
      where: { userId: owner.id, type: "EXPENSE" },
    });
    const card = await prisma.account.create({
      data: {
        name: "Paid Forecast Card",
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
        userId: owner.id,
      },
    });

    const purchase = await prisma.transaction.create({
      data: {
        amount: 9_000,
        year: 2028,
        month: 4,
        day: 4,
        type: "EXPENSE",
        description: "Compra já paga",
        status: "COMPLETED",
        accountId: card.id,
        categoryId: expenseCategory.id,
        userId: owner.id,
      },
    });
    const sourceTransaction = await prisma.transaction.create({
      data: {
        amount: 9_000,
        year: 2028,
        month: 4,
        day: 6,
        type: "EXPENSE",
        kind: "CARD_PAYMENT",
        description: "Pagamento fatura",
        status: "COMPLETED",
        accountId: brlAccount.id,
        categoryId: null,
        userId: owner.id,
      },
    });
    await prisma.creditCardPayment.create({
      data: {
        amount: purchase.amount,
        closingYear: 2028,
        closingMonth: 4,
        closingDay: 5,
        idempotencyKeyHash: "a".repeat(64),
        requestHash: "b".repeat(64),
        userId: owner.id,
        cardAccountId: card.id,
        sourceAccountId: brlAccount.id,
        sourceTransactionId: sourceTransaction.id,
      },
    });

    const result = await getForecastForUser(
      owner.id,
      { currency: "BRL", days: 30 },
      new Date("2028-04-10T12:00:00.000Z"),
    );

    expect(result.cardCommitments.upcoming).toEqual([]);
    expect(result.cardCommitments.overdue).toEqual([]);
  });

  it("uses UTC explicitly when converting the injected clock to a logical date", () => {
    expect(logicalDateFromUtcInstant(new Date("2028-01-01T00:30:00+14:00"))).toEqual({
      year: 2027,
      month: 12,
      day: 31,
    });
  });
});
