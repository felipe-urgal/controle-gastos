import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { accountCrud } from "@/app/lib/accounts/account-crud";

const createdUserIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("account detail recent transactions", () => {
  it("keeps completed transactions visible when many future pending ones exist", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Recent Transactions Owner",
        email: `recent-transactions-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);

    const account = await prisma.account.create({
      data: {
        name: `Conta ${suffix}`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: owner.id,
      },
    });

    const category = await prisma.category.create({
      data: { name: `Categoria ${suffix}`, type: "EXPENSE", userId: owner.id },
    });

    const base = {
      type: "EXPENSE" as const,
      kind: "NORMAL" as const,
      accountId: account.id,
      categoryId: category.id,
      userId: owner.id,
    };

    await prisma.transaction.createMany({
      data: [
        {
          ...base,
          amount: 1_000,
          year: 2031,
          month: 1,
          day: 10,
          status: "COMPLETED",
          description: "Realizada",
        },
        // Mais pendentes futuras do que o limite da página da conta.
        ...Array.from({ length: 15 }, (_, index) => ({
          ...base,
          amount: 500,
          year: 2031,
          month: 6,
          day: index + 1,
          status: "PENDING" as const,
          description: `Pendente ${index + 1}`,
        })),
      ],
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await accountCrud.getById(
      new Request(`http://localhost/api/accounts/${account.id}`),
      { params: Promise.resolve({ id: account.id }) }
    );
    const body = await response.json();
    const transactions: Array<{ status: string; description: string }> =
      body.data.transactions;

    expect(response.status).toBe(200);
    expect(
      transactions.filter((item) => item.status === "COMPLETED").map((item) => item.description)
    ).toEqual(["Realizada"]);
    expect(transactions.filter((item) => item.status === "PENDING")).toHaveLength(12);
  });
});
