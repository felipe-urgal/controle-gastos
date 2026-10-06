import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { getTagReport } from "@/app/lib/tags/tag-report";
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
    const [checking, card, usdAccount] = await Promise.all([
      factory.account(owner.id),
      factory.account(owner.id, { type: "CREDIT_CARD" }),
      factory.account(owner.id, { currency: "USD" }),
    ]);
    const [incomeCategory, expenseCategory] = await Promise.all([
      factory.category(owner.id, { type: "INCOME" }),
      factory.category(owner.id, { type: "EXPENSE" }),
    ]);
    const tag = await prisma.tag.create({
      data: { userId: owner.id, name: "viagem", normalizedName: "viagem" },
    });

    const transactions = await Promise.all([
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
          amount: 9_000,
          type: "EXPENSE",
          kind: "TRANSFER",
          description: "Transferência",
        },
      }),
      factory.transaction({
        userId: owner.id,
        accountId: checking.id,
        categoryId: expenseCategory.id,
        overrides: {
          amount: 8_000,
          type: "EXPENSE",
          kind: "CARD_PAYMENT",
          description: "Pagamento de fatura",
        },
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

    await prisma.transactionTag.createMany({
      data: transactions.map((transaction) => ({
        userId: owner.id,
        transactionId: transaction.id,
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
});
