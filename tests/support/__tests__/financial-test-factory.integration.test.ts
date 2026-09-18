import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("FinancialTestFactory", () => {
  it("creates a complete owned financial fixture with explicit overrides", async () => {
    const user = await fixtures.user({ name: "Factory Owner" });
    const account = await fixtures.account(user.id, {
      name: "Factory USD",
      currency: "USD",
    });
    const category = await fixtures.category(user.id, {
      name: "Factory Income",
      type: "INCOME",
    });
    const transaction = await fixtures.transaction({
      userId: user.id,
      accountId: account.id,
      categoryId: category.id,
      overrides: {
        amount: 12_345,
        type: "INCOME",
        description: "Factory salary",
        status: "PENDING",
      },
    });

    expect(account).toMatchObject({
      userId: user.id,
      currency: "USD",
      type: "CREDIT_DEBIT",
    });
    expect(category).toMatchObject({
      userId: user.id,
      type: "INCOME",
    });
    expect(transaction).toMatchObject({
      userId: user.id,
      accountId: account.id,
      categoryId: category.id,
      amount: 12_345,
      type: "INCOME",
      status: "PENDING",
    });
  });

  it("cleans only users created by its own instance", async () => {
    const otherFactory = new FinancialTestFactory();
    const owned = await fixtures.user({ name: "Owned fixture" });
    const external = await otherFactory.user({ name: "External fixture" });

    await fixtures.cleanup();

    expect(await prisma.user.findUnique({ where: { id: owned.id } })).toBeNull();
    expect(
      await prisma.user.findUnique({ where: { id: external.id } }),
    ).not.toBeNull();

    await otherFactory.cleanup();
  });
});
