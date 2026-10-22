import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { logicalDateFromUtcInstant } from "@/app/lib/date/logical-date";
import { getTagReport } from "@/app/lib/tags/tag-report";
import { tagHistoryWindow } from "@/app/lib/tags/tag-report-model";
import { createTransferForUser } from "@/app/lib/transfers/create-transfer";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const factory = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await factory.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("tag report integration", () => {
  it("counts the full transaction in each overlapping tag without making tags additive", async () => {
    const owner = await factory.user();
    const account = await factory.account(owner.id);
    const category = await factory.category(owner.id, { type: "EXPENSE" });
    const [firstTag, secondTag] = await Promise.all([
      prisma.tag.create({
        data: {
          userId: owner.id,
          name: "familia",
          normalizedName: "familia",
        },
      }),
      prisma.tag.create({
        data: {
          userId: owner.id,
          name: "ferias",
          normalizedName: "ferias",
        },
      }),
    ]);
    const transaction = await factory.transaction({
      userId: owner.id,
      accountId: account.id,
      categoryId: category.id,
      overrides: {
        amount: 5_000,
        type: "EXPENSE",
        description: "Despesa compartilhada entre tags",
      },
    });

    await prisma.transactionTag.createMany({
      data: [firstTag, secondTag].map((tag) => ({
        userId: owner.id,
        transactionId: transaction.id,
        tagId: tag.id,
      })),
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const reports = await Promise.all(
      [firstTag, secondTag].map(async (tag) => {
        const response = await getTagReport(
          new Request(`http://localhost/api/tags/${tag.id}/report`),
          { params: Promise.resolve({ id: tag.id }) },
        );
        expect(response.status).toBe(200);
        return response.json();
      }),
    );

    for (const body of reports) {
      expect(body.data.currencies).toEqual([
        {
          currency: "BRL",
          transactionCount: 1,
          income: 0,
          expense: 5_000,
          balance: -5_000,
        },
      ]);
    }
  });

  it("uses canonical card semantics and ignores non-normal financial movements", async () => {
    const owner = await factory.user();
    const [checking, transferDestination, card, usdAccount] = await Promise.all([
      factory.account(owner.id),
      factory.account(owner.id),
      factory.account(owner.id, {
        type: "CREDIT_CARD",
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
      }),
      factory.account(owner.id, { currency: "USD" }),
    ]);
    const [incomeCategory, expenseCategory] = await Promise.all([
      factory.category(owner.id, { type: "INCOME" }),
      factory.category(owner.id, { type: "EXPENSE" }),
    ]);
    const tag = await prisma.tag.create({
      data: { userId: owner.id, name: "viagem", normalizedName: "viagem" },
    });

    const normalTransactions = await Promise.all([
      factory.transaction({
        userId: owner.id,
        accountId: checking.id,
        categoryId: incomeCategory.id,
        overrides: { amount: 10_000, type: "INCOME", description: "Receita" },
      }),
      factory.transaction({
        userId: owner.id,
        accountId: checking.id,
        categoryId: expenseCategory.id,
        overrides: { amount: 2_500, type: "EXPENSE", description: "Despesa" },
      }),
      factory.transaction({
        userId: owner.id,
        accountId: card.id,
        categoryId: expenseCategory.id,
        overrides: { amount: 5_000, type: "EXPENSE", description: "Compra cartão" },
      }),
      factory.transaction({
        userId: owner.id,
        accountId: card.id,
        categoryId: incomeCategory.id,
        overrides: { amount: 1_000, type: "INCOME", description: "Estorno cartão" },
      }),
      factory.transaction({
        userId: owner.id,
        accountId: usdAccount.id,
        categoryId: expenseCategory.id,
        overrides: { amount: 2_000, type: "EXPENSE", description: "Despesa USD" },
      }),
      factory.transaction({
        userId: owner.id,
        accountId: checking.id,
        categoryId: expenseCategory.id,
        overrides: {
          amount: 7_000,
          type: "EXPENSE",
          status: "PENDING",
          description: "Pendente",
        },
      }),
    ]);

    const transfer = await createTransferForUser(
      owner.id,
      {
        sourceAccountId: checking.id,
        destinationAccountId: transferDestination.id,
        amountCents: 9_000,
        year: 2030,
        month: 1,
        day: 1,
        description: "Transferência",
        status: "COMPLETED",
      },
      "tag-report-transfer",
    );

    const cardPayment = await factory.transaction({
      userId: owner.id,
      accountId: checking.id,
      categoryId: null,
      overrides: {
        amount: 8_000,
        type: "EXPENSE",
        kind: "CARD_PAYMENT",
        description: "Pagamento de fatura",
      },
    });

    await prisma.transactionTag.createMany({
      data: [
        ...normalTransactions.map((transaction) => transaction.id),
        transfer.sourceTransactionId,
        transfer.destinationTransactionId,
        cardPayment.id,
      ].map((transactionId) => ({
        userId: owner.id,
        transactionId,
        tagId: tag.id,
      })),
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await getTagReport(
      new Request(`http://localhost/api/tags/${tag.id}/report`),
      { params: Promise.resolve({ id: tag.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.currencies).toEqual([
      {
        currency: "BRL",
        transactionCount: 4,
        income: 10_000,
        expense: 6_500,
        balance: 3_500,
      },
      {
        currency: "USD",
        transactionCount: 1,
        income: 0,
        expense: 2_000,
        balance: -2_000,
      },
    ]);
  });

  it("filtra o relatório por período e devolve seis meses de histórico", async () => {
    const owner = await factory.user();
    const account = await factory.account(owner.id);
    const category = await factory.category(owner.id, { type: "EXPENSE" });
    const tag = await prisma.tag.create({
      data: { userId: owner.id, name: "viagem", normalizedName: "viagem" },
    });
    const today = logicalDateFromUtcInstant(new Date());
    const previous = tagHistoryWindow(today)[4];
    const old = { year: today.year - 2, month: 1 };

    for (const [period, amount] of [
      [today, 3_000],
      [previous, 1_000],
      [old, 7_000],
    ] as const) {
      const transaction = await factory.transaction({
        userId: owner.id,
        accountId: account.id,
        categoryId: category.id,
        overrides: { amount, type: "EXPENSE", year: period.year, month: period.month },
      });
      await prisma.transactionTag.create({
        data: { userId: owner.id, transactionId: transaction.id, tagId: tag.id },
      });
    }

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const read = async (period: string) => {
      const response = await getTagReport(
        new Request(`http://localhost/api/tags/${tag.id}/report?period=${period}`),
        { params: Promise.resolve({ id: tag.id }) },
      );
      expect(response.status).toBe(200);
      return (await response.json()).data;
    };

    expect((await read("month")).currencies[0]).toMatchObject({ transactionCount: 1, expense: 3_000 });
    expect((await read("all")).currencies[0]).toMatchObject({ transactionCount: 3, expense: 11_000 });

    const report = await read("all");
    expect(report.period).toBe("all");
    expect(report.history).toHaveLength(1);
    expect(report.history[0].points).toHaveLength(6);
    expect(report.history[0].points[5].expense).toBe(3_000);
    expect(report.history[0].points[4].expense).toBe(1_000);
  });
});
