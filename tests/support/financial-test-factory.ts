import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

type UserOverrides = Partial<Prisma.UserUncheckedCreateInput>;
type AccountOverrides = Partial<
  Omit<Prisma.AccountUncheckedCreateInput, "userId">
>;
type CategoryOverrides = Partial<
  Omit<Prisma.CategoryUncheckedCreateInput, "userId">
>;
type TransactionOverrides = Partial<
  Omit<
    Prisma.TransactionUncheckedCreateInput,
    "userId" | "accountId" | "categoryId"
  >
>;

type TransactionFactoryInput = {
  userId: string;
  accountId: string;
  categoryId?: string | null;
  overrides?: TransactionOverrides;
};

export class FinancialTestFactory {
  private readonly createdUserIds = new Set<string>();
  private sequence = 0;

  private nextSuffix(label: string) {
    this.sequence += 1;
    return `${label}-${this.sequence}-${randomUUID()}`;
  }

  async user(overrides: UserOverrides = {}) {
    const suffix = this.nextSuffix("user");
    const user = await prisma.user.create({
      data: {
        name: `Test User ${this.sequence}`,
        email: `${suffix}@example.test`,
        password: "test-hash",
        ...overrides,
      },
    });

    this.createdUserIds.add(user.id);
    return user;
  }

  async account(userId: string, overrides: AccountOverrides = {}) {
    const suffix = this.nextSuffix("account");

    return prisma.account.create({
      data: {
        name: `Test Account ${suffix}`.slice(0, 100),
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId,
        ...overrides,
      },
    });
  }

  async category(userId: string, overrides: CategoryOverrides = {}) {
    const suffix = this.nextSuffix("category");

    return prisma.category.create({
      data: {
        name: `Test Category ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId,
        ...overrides,
      },
    });
  }

  async transaction({
    userId,
    accountId,
    categoryId,
    overrides = {},
  }: TransactionFactoryInput) {
    const suffix = this.nextSuffix("transaction");

    return prisma.transaction.create({
      data: {
        amount: 1_000,
        year: 2030,
        month: 1,
        day: 1,
        type: "EXPENSE",
        description: `Test transaction ${suffix}`.slice(0, 255),
        status: "COMPLETED",
        userId,
        accountId,
        categoryId: categoryId ?? null,
        ...overrides,
      },
    });
  }

  async cleanup() {
    const ids = [...this.createdUserIds];
    this.createdUserIds.clear();

    if (ids.length === 0) return;

    await prisma.user.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
