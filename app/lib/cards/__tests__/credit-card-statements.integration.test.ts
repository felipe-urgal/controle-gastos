import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { getCreditCardStatements } from "@/app/lib/cards/credit-card-statements-handler";
import { prisma } from "@/app/lib/prisma";

const users: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (users.length) {
    await prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function fixture() {
  const suffix = randomUUID();
  const [owner, other] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Card Owner",
        email: `card-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Card Other",
        email: `card-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  users.push(owner.id, other.id);

  const [card, foreignCard] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Cartão ${suffix}`,
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 500_000,
        statementClosingDay: 5,
        statementDueDay: 12,
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Cartão externo ${suffix}`,
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
        userId: other.id,
      },
    }),
  ]);

  const category = await prisma.category.create({
    data: {
      name: `Compras ${suffix}`.slice(0, 50),
      type: "EXPENSE",
      userId: owner.id,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        amount: 2_000,
        year: 2026,
        month: 8,
        day: 4,
        type: "EXPENSE",
        description: "Histórico",
        status: "COMPLETED",
        accountId: card.id,
        categoryId: category.id,
        userId: owner.id,
      },
      {
        amount: 3_000,
        year: 2026,
        month: 9,
        day: 4,
        type: "EXPENSE",
        description: "Atual",
        status: "COMPLETED",
        accountId: card.id,
        categoryId: category.id,
        userId: owner.id,
      },
      {
        amount: 4_000,
        year: 2026,
        month: 9,
        day: 5,
        type: "EXPENSE",
        description: "Futura",
        status: "PENDING",
        accountId: card.id,
        categoryId: category.id,
        userId: owner.id,
      },
    ],
  });

  return { owner, other, card, foreignCard };
}

describe("credit card statements handler", () => {
  it("returns only the owned card statements with deterministic asOf", async () => {
    const { owner, card } = await fixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await getCreditCardStatements(
      new Request(
        `http://localhost/api/cards/${card.id}/statements?asOf=2026-09-04&history=12`,
      ),
      { params: Promise.resolve({ id: card.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.card).toMatchObject({
      id: card.id,
      currency: "BRL",
      creditLimit: 500_000,
      statementClosingDay: 5,
      statementDueDay: 12,
    });
    expect(body.data.current.total).toBe(3_000);
    expect(body.data.history.map((item: any) => item.total)).toEqual([2_000]);
    expect(body.data.future.map((item: any) => item.total)).toEqual([4_000]);
  });

  it("does not reveal a card owned by another user", async () => {
    const { owner, foreignCard } = await fixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await getCreditCardStatements(
      new Request(
        `http://localhost/api/cards/${foreignCard.id}/statements?asOf=2026-09-04`,
      ),
      { params: Promise.resolve({ id: foreignCard.id }) },
    );

    expect(response.status).toBe(404);
  });

  it("rejects invalid query dates", async () => {
    const { owner, card } = await fixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await getCreditCardStatements(
      new Request(
        `http://localhost/api/cards/${card.id}/statements?asOf=2026-02-30`,
      ),
      { params: Promise.resolve({ id: card.id }) },
    );

    expect(response.status).toBe(400);
  });
});
