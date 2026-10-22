import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { getCreditCardStatuses } from "@/app/lib/cards/credit-card-status";
import { prisma } from "@/app/lib/prisma";

const users: string[] = [];

afterEach(async () => {
  if (users.length) {
    await prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUserWithCard(label: string) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: { name: label, email: `card-status-${label}-${suffix}@example.com`, password: "test-hash" },
  });
  users.push(user.id);
  const card = await prisma.account.create({
    data: {
      name: `Cartão ${suffix}`,
      type: "CREDIT_CARD",
      currency: "BRL",
      creditLimit: 500_000,
      statementClosingDay: 5,
      statementDueDay: 12,
      userId: user.id,
    },
  });
  const category = await prisma.category.create({
    data: { name: `Compras ${suffix}`, type: "EXPENSE", userId: user.id },
  });
  return { user, card, category };
}

function purchase(
  owner: { user: { id: string }; category: { id: string } },
  accountId: string,
  year: number,
  month: number,
  day: number,
  amount: number,
) {
  return {
    userId: owner.user.id,
    categoryId: owner.category.id,
    accountId,
    year,
    month,
    day,
    amount,
    type: "EXPENSE" as const,
    status: "COMPLETED" as const,
    description: "Compra",
  };
}

describe("getCreditCardStatuses", () => {
  it("separa fatura vencida da próxima e soma o limite usado", async () => {
    const owner = await createUserWithCard("owner");
    const { user, card } = owner;
    await prisma.transaction.createMany({
      data: [purchase(owner, card.id, 2028, 3, 20, 30_000), purchase(owner, card.id, 2028, 4, 10, 12_000)],
    });

    const statuses = await getCreditCardStatuses({
      userId: user.id,
      cards: [{ id: card.id, name: card.name, statementClosingDay: 5, statementDueDay: 12 }],
      asOf: { year: 2028, month: 4, day: 20 },
    });
    const status = statuses.get(card.id);

    expect(status?.usedLimit).toBe(42_000);
    expect(status?.overdueStatements).toEqual([
      expect.objectContaining({ amount: 30_000, dueDate: { year: 2028, month: 4, day: 12 } }),
    ]);
    expect(status?.nextStatement).toMatchObject({ amount: 12_000, dueDate: { year: 2028, month: 5, day: 12 } });
  });

  it("não vê cartão nem compras de outro usuário", async () => {
    const owner = await createUserWithCard("owner");
    const other = await createUserWithCard("other");
    await prisma.transaction.createMany({ data: [purchase(other, other.card.id, 2028, 4, 10, 99_000)] });

    const statuses = await getCreditCardStatuses({
      userId: owner.user.id,
      cards: [{ id: other.card.id, name: other.card.name, statementClosingDay: 5, statementDueDay: 12 }],
      asOf: { year: 2028, month: 4, day: 20 },
    });

    expect(statuses.get(other.card.id)).toMatchObject({ usedLimit: 0, nextStatement: null, overdueStatements: [] });
  });

  it("devolve só o limite usado quando o ciclo da fatura não está configurado", async () => {
    const owner = await createUserWithCard("owner");
    const { user, card } = owner;
    await prisma.transaction.createMany({ data: [purchase(owner, card.id, 2028, 4, 10, 8_000)] });

    const statuses = await getCreditCardStatuses({
      userId: user.id,
      cards: [{ id: card.id, name: card.name, statementClosingDay: null, statementDueDay: null }],
      asOf: { year: 2028, month: 4, day: 20 },
    });

    expect(statuses.get(card.id)).toMatchObject({ usedLimit: 8_000, nextStatement: null, overdueStatements: [] });
  });

  it("devolve mapa vazio sem cartões", async () => {
    const { user } = await createUserWithCard("owner");

    expect((await getCreditCardStatuses({ userId: user.id, cards: [], asOf: { year: 2028, month: 4, day: 20 } })).size).toBe(0);
  });
});
