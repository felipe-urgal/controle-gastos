import { afterAll, afterEach, describe, expect, it } from "vitest";

import { getFinancialCommitmentsForUser } from "@/app/lib/commitments/financial-commitments";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("debt commitments integration", () => {
  it("surfaces the known next installment without creating a financial transaction", async () => {
    const owner = await fixtures.user({ name: "Debt Commitment Owner" });
    await prisma.debt.create({
      data: {
        userId: owner.id,
        name: "Financiamento",
        currency: "BRL",
        balance: 100_000,
        installmentAmount: 10_000,
        dueYear: 2026,
        dueMonth: 10,
        dueDay: 10,
        remainingInstallments: 10,
        institution: "Banco",
        adjustments: {
          create: {
            userId: owner.id,
            previousBalance: 0,
            newBalance: 100_000,
            delta: 100_000,
            description: "Saldo inicial",
          },
        },
      },
    });

    const data = await getFinancialCommitmentsForUser(
      owner.id,
      { currency: "BRL", days: 30 },
      new Date("2026-09-30T12:00:00.000Z"),
    );

    expect(data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "DEBT_INSTALLMENT",
          title: "Parcela · Financiamento",
          amount: 10_000,
          date: { year: 2026, month: 10, day: 10 },
          href: "/dividas",
          accountName: "Banco",
        }),
      ]),
    );
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);
  });
});
