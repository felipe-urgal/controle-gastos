import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { getAccountActivity } from "@/app/lib/accounts/account-activity";
import { prisma } from "@/app/lib/prisma";

const users: string[] = [];
const asOf = { year: 2028, month: 4, day: 10 };

afterEach(async () => {
  if (users.length) {
    await prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createOwner(label: string) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: { name: label, email: `activity-${label}-${suffix}@example.com`, password: "test-hash" },
  });
  users.push(user.id);
  const [account, category] = await Promise.all([
    prisma.account.create({ data: { name: `Conta ${suffix}`, type: "CREDIT_DEBIT", currency: "BRL", userId: user.id } }),
    prisma.category.create({ data: { name: `Cat ${suffix}`, type: "EXPENSE", userId: user.id } }),
  ]);
  return { user, account, category };
}

function tx(
  owner: { user: { id: string }; category: { id: string } },
  accountId: string,
  date: { year: number; month: number; day: number },
  type: "INCOME" | "EXPENSE",
  amount: number,
  status: "COMPLETED" | "PENDING" | "CANCELLED" = "COMPLETED",
) {
  return { userId: owner.user.id, categoryId: owner.category.id, accountId, ...date, type, amount, status, description: "Movimento" };
}

describe("getAccountActivity", () => {
  it("soma entradas e saídas concluídas do mês, separa pendentes e ignora canceladas", async () => {
    const owner = await createOwner("owner");
    const { account } = owner;
    await prisma.transaction.createMany({
      data: [
        tx(owner, account.id, { year: 2028, month: 4, day: 2 }, "INCOME", 500_000),
        tx(owner, account.id, { year: 2028, month: 4, day: 8 }, "EXPENSE", 120_000),
        tx(owner, account.id, { year: 2028, month: 3, day: 28 }, "EXPENSE", 30_000),
        tx(owner, account.id, { year: 2028, month: 4, day: 15 }, "EXPENSE", 20_000, "PENDING"),
        tx(owner, account.id, { year: 2028, month: 4, day: 20 }, "INCOME", 5_000, "PENDING"),
        tx(owner, account.id, { year: 2028, month: 4, day: 9 }, "EXPENSE", 99_000, "CANCELLED"),
      ],
    });

    const activity = await getAccountActivity({ userId: owner.user.id, accountId: account.id, currentBalance: 350_000, asOf });

    expect(activity).toMatchObject({ monthIncome: 500_000, monthExpense: 120_000, pendingNet: -15_000, pendingCount: 2 });
    expect(activity.balanceSeries).toHaveLength(30);
    expect(activity.balanceSeries.at(-1)).toBe(350_000);
    // Hoje (10/4) e ontem (9/4, cancelada ignorada) têm o mesmo saldo; o gasto de 8/4 sai do fim do dia 7.
    expect(activity.balanceSeries.at(-2)).toBe(350_000); // fim de 9/4
    expect(activity.balanceSeries.at(-3)).toBe(350_000); // fim de 8/4
    expect(activity.balanceSeries.at(-4)).toBe(470_000); // fim de 7/4
    expect(activity.balanceSeries.at(-9)).toBe(470_000); // fim de 2/4, já com a entrada
    expect(activity.balanceSeries.at(-10)).toBe(-30_000); // fim de 1/4, antes da entrada
    expect(activity.balanceSeries.at(-15)).toBe(0); // fim de 27/3, antes da saída de 28/3
  });

  it("não mistura movimentos de outro usuário", async () => {
    const owner = await createOwner("owner");
    const other = await createOwner("other");
    await prisma.transaction.createMany({
      data: [tx(other, other.account.id, { year: 2028, month: 4, day: 5 }, "INCOME", 777_000)],
    });

    const activity = await getAccountActivity({ userId: owner.user.id, accountId: other.account.id, currentBalance: 0, asOf });

    expect(activity).toMatchObject({ monthIncome: 0, monthExpense: 0, pendingNet: 0, pendingCount: 0 });
  });
});
