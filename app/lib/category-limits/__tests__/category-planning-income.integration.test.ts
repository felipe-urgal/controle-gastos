import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { listCategoryMonthlyLimitsForUser } from "@/app/lib/category-limits/category-monthly-limits";
import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("category planning income semantics", () => {
  it("counts only normal income from non-card accounts", async () => {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: "Planning Income Owner",
        email: `planning-income-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(user.id);

    const [bank, sourceBank, card, expenseCategory, incomeCategory] = await Promise.all([
      prisma.account.create({
        data: {
          name: "Conta corrente",
          type: "CREDIT_DEBIT",
          currency: "BRL",
          userId: user.id,
        },
      }),
      prisma.account.create({
        data: {
          name: "Conta origem",
          type: "CREDIT_DEBIT",
          currency: "BRL",
          userId: user.id,
        },
      }),
      prisma.account.create({
        data: {
          name: "Cartão",
          type: "CREDIT_CARD",
          currency: "BRL",
          creditLimit: 100_000,
          statementClosingDay: 5,
          statementDueDay: 12,
          userId: user.id,
        },
      }),
      prisma.category.create({
        data: { name: "Despesa", type: "EXPENSE", userId: user.id },
      }),
      prisma.category.create({
        data: { name: "Receita", type: "INCOME", userId: user.id },
      }),
    ]);

    const transfer = await prisma.transfer.create({
      data: { userId: user.id },
    });

    await prisma.transaction.createMany({
      data: [
        {
          amount: 10_000,
          year: 2031,
          month: 6,
          day: 1,
          type: "INCOME",
          kind: "NORMAL",
          description: "Salário",
          status: "COMPLETED",
          accountId: bank.id,
          categoryId: incomeCategory.id,
          userId: user.id,
        },
        {
          amount: 4_000,
          year: 2031,
          month: 6,
          day: 2,
          type: "EXPENSE",
          kind: "TRANSFER",
          description: "Transferência enviada",
          status: "COMPLETED",
          accountId: sourceBank.id,
          categoryId: null,
          transferId: transfer.id,
          transferRole: "SOURCE",
          userId: user.id,
        },
        {
          amount: 4_000,
          year: 2031,
          month: 6,
          day: 2,
          type: "INCOME",
          kind: "TRANSFER",
          description: "Transferência recebida",
          status: "COMPLETED",
          accountId: bank.id,
          categoryId: null,
          transferId: transfer.id,
          transferRole: "DESTINATION",
          userId: user.id,
        },
        {
          amount: 3_000,
          year: 2031,
          month: 6,
          day: 3,
          type: "INCOME",
          kind: "NORMAL",
          description: "Crédito no cartão",
          status: "COMPLETED",
          accountId: card.id,
          categoryId: incomeCategory.id,
          userId: user.id,
        },
        {
          amount: 5_000,
          year: 2031,
          month: 6,
          day: 20,
          type: "INCOME",
          kind: "NORMAL",
          description: "Receita pendente",
          status: "PENDING",
          accountId: bank.id,
          categoryId: incomeCategory.id,
          userId: user.id,
        },
      ],
    });

    const planning = await listCategoryMonthlyLimitsForUser(
      user.id,
      2031,
      6,
      "BRL",
    );

    expect(expenseCategory.id).toBeTruthy();
    expect(planning.summary).toMatchObject({
      realizedIncome: 10_000,
      expectedIncome: 5_000,
      totalIncome: 15_000,
    });
  });
});
