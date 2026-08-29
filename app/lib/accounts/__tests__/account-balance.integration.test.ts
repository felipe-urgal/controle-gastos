import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/app/lib/prisma";
import {
  withDerivedAccountBalance,
  withDerivedAccountBalances,
} from "@/app/lib/accounts/account-balance";

const createdUserIds: string[] = [];

describe("derived account balances", () => {
  afterEach(async () => {
    const ids = createdUserIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("uses only COMPLETED transactions and keeps list/detail consistent", async () => {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: "Balance test",
        email: `balance-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(user.id);

    const [account, secondAccount] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Principal ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: user.id,
        },
      }),
      prisma.account.create({
        data: {
          name: `Reserva ${suffix}`,
          type: "INVESTMENT",
          userId: user.id,
        },
      }),
    ]);

    const [incomeCategory, expenseCategory] = await Promise.all([
      prisma.category.create({
        data: {
          name: `Receita ${suffix}`.slice(0, 50),
          type: "INCOME",
          userId: user.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Despesa ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: user.id,
        },
      }),
    ]);

    await prisma.transaction.createMany({
      data: [
        {
          amount: 10_000,
          month: 8,
          year: 2026,
          day: 29,
          type: "INCOME",
          description: "Receita concluída",
          status: "COMPLETED",
          accountId: account.id,
          categoryId: incomeCategory.id,
          userId: user.id,
        },
        {
          amount: 2_500,
          month: 8,
          year: 2026,
          day: 29,
          type: "EXPENSE",
          description: "Despesa concluída",
          status: "COMPLETED",
          accountId: account.id,
          categoryId: expenseCategory.id,
          userId: user.id,
        },
        {
          amount: 99_000,
          month: 8,
          year: 2026,
          day: 29,
          type: "INCOME",
          description: "Receita pendente",
          status: "PENDING",
          accountId: account.id,
          categoryId: incomeCategory.id,
          userId: user.id,
        },
        {
          amount: 50_000,
          month: 8,
          year: 2026,
          day: 29,
          type: "EXPENSE",
          description: "Despesa cancelada",
          status: "CANCELLED",
          accountId: account.id,
          categoryId: expenseCategory.id,
          userId: user.id,
        },
      ],
    });

    const list = await withDerivedAccountBalances(
      [account, secondAccount],
      user.id
    );
    const detail = await withDerivedAccountBalance(account, user.id);

    expect(list.find((item) => item.id === account.id)?.balance).toBe(7_500);
    expect(list.find((item) => item.id === secondAccount.id)?.balance).toBe(0);
    expect(detail.balance).toBe(7_500);
  });

  it("ignores inconsistent cross-user transaction ownership", async () => {
    const suffix = randomUUID();
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Owner",
          email: `owner-${suffix}@example.com`,
          password: "test-hash",
        },
      }),
      prisma.user.create({
        data: {
          name: "Other",
          email: `other-${suffix}@example.com`,
          password: "test-hash",
        },
      }),
    ]);
    createdUserIds.push(owner.id, otherUser.id);

    const [account, otherCategory] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Owner account ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Other income ${suffix}`.slice(0, 50),
          type: "INCOME",
          userId: otherUser.id,
        },
      }),
    ]);

    // The database relations do not encode the domain invariant that transaction,
    // account and category must share the same user. Seed an inconsistent row to
    // ensure balance reads still enforce ownership defensively.
    await prisma.transaction.create({
      data: {
        amount: 99_999,
        month: 8,
        year: 2026,
        day: 29,
        type: "INCOME",
        description: "Cross-user inconsistent row",
        status: "COMPLETED",
        accountId: account.id,
        categoryId: otherCategory.id,
        userId: otherUser.id,
      },
    });

    const ownerView = await withDerivedAccountBalance(account, owner.id);
    const foreignView = await withDerivedAccountBalance(account, otherUser.id);

    expect(ownerView.balance).toBe(0);
    expect(foreignView.balance).toBe(0);
  });
});
