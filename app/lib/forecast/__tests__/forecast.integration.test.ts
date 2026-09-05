import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import {
  getForecastForUser,
  logicalDateFromUtcInstant,
} from "@/app/lib/forecast/forecast";
import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createForecastFixture() {
  const suffix = randomUUID();
  const [owner, otherUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Forecast Owner",
        email: `forecast-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Forecast Other",
        email: `forecast-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  createdUserIds.push(owner.id, otherUser.id);

  const [brlAccount, usdAccount, inactiveBrlAccount, otherAccount] =
    await Promise.all([
      prisma.account.create({
        data: {
          name: `Forecast BRL ${suffix}`,
          type: "CREDIT_DEBIT",
          currency: "BRL",
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: `Forecast USD ${suffix}`,
          type: "CREDIT_DEBIT",
          currency: "USD",
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: `Forecast inactive ${suffix}`,
          type: "CREDIT_DEBIT",
          currency: "BRL",
          isActive: false,
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: `Forecast foreign ${suffix}`,
          type: "CREDIT_DEBIT",
          currency: "BRL",
          userId: otherUser.id,
        },
      }),
    ]);

  const [ownerIncome, ownerExpense, otherExpense] = await Promise.all([
    prisma.category.create({
      data: {
        name: `Forecast receita ${suffix}`.slice(0, 50),
        type: "INCOME",
        userId: owner.id,
      },
    }),
    prisma.category.create({
      data: {
        name: `Forecast despesa ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: owner.id,
      },
    }),
    prisma.category.create({
      data: {
        name: `Forecast externa ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: otherUser.id,
      },
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
    const transactionCountBefore = await prisma.transaction.count();

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
    expect(result.accounts.map((account) => account.id)).not.toContain(usdAccount.id);
    expect(result.accounts.map((account) => account.id)).not.toContain(
      inactiveBrlAccount.id
    );
    expect(await prisma.transaction.count()).toBe(transactionCountBefore);
  });

  it("uses UTC explicitly when converting the injected clock to a logical date", () => {
    expect(logicalDateFromUtcInstant(new Date("2028-01-01T00:30:00+14:00"))).toEqual({
      year: 2027,
      month: 12,
      day: 31,
    });
  });
});
