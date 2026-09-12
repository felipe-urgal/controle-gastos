import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/app/lib/prisma";

describe("user deletion cascade", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("removes all user-owned records when the user is deleted", async () => {
    const suffix = randomUUID();

    const user = await prisma.user.create({
      data: {
        name: "Usuário de teste",
        email: `delete-${suffix}@example.com`,
        password: "hash-de-teste",
      },
    });

    const account = await prisma.account.create({
      data: {
        name: `Conta ${suffix}`,
        type: "CREDIT_DEBIT",
        userId: user.id,
      },
    });

    const category = await prisma.category.create({
      data: {
        name: `Categoria ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: user.id,
      },
    });

    await prisma.transaction.create({
      data: {
        amount: 1000,
        month: 8,
        year: 2026,
        day: 29,
        type: "EXPENSE",
        description: "Transação de teste",
        status: "COMPLETED",
        accountId: account.id,
        categoryId: category.id,
        userId: user.id,
      },
    });

    await prisma.passwordResetToken.create({
      data: {
        token: `token-${suffix}`,
        userId: user.id,
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const [userCount, accountCount, categoryCount, transactionCount, tokenCount] =
      await Promise.all([
        prisma.user.count({ where: { id: user.id } }),
        prisma.account.count({ where: { userId: user.id } }),
        prisma.category.count({ where: { userId: user.id } }),
        prisma.transaction.count({ where: { userId: user.id } }),
        prisma.passwordResetToken.count({ where: { userId: user.id } }),
      ]);

    expect({
      userCount,
      accountCount,
      categoryCount,
      transactionCount,
      tokenCount,
    }).toEqual({
      userCount: 0,
      accountCount: 0,
      categoryCount: 0,
      transactionCount: 0,
      tokenCount: 0,
    });
  });
});
