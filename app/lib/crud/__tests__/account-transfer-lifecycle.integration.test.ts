import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { accountCrud } from "@/app/lib/crud/account.crud";

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

describe("account transfer lifecycle", () => {
  it("blocks deleting either account of a transfer while keeping the pair intact", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Transfer Lifecycle Owner",
        email: `transfer-lifecycle-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);

    const [sourceAccount, destinationAccount] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Origem ${suffix}`,
          type: "CREDIT_DEBIT",
          currency: "BRL",
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: `Destino ${suffix}`,
          type: "CREDIT_DEBIT",
          currency: "BRL",
          userId: owner.id,
        },
      }),
    ]);

    const transfer = await prisma.transfer.create({ data: { userId: owner.id } });

    await prisma.transaction.createMany({
      data: [
        {
          amount: 8_500,
          year: 2031,
          month: 2,
          day: 3,
          type: "EXPENSE",
          kind: "TRANSFER",
          status: "COMPLETED",
          description: "Transferência interna",
          accountId: sourceAccount.id,
          categoryId: null,
          userId: owner.id,
          transferId: transfer.id,
          transferRole: "SOURCE",
        },
        {
          amount: 8_500,
          year: 2031,
          month: 2,
          day: 3,
          type: "INCOME",
          kind: "TRANSFER",
          status: "COMPLETED",
          description: "Transferência interna",
          accountId: destinationAccount.id,
          categoryId: null,
          userId: owner.id,
          transferId: transfer.id,
          transferRole: "DESTINATION",
        },
      ],
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    for (const accountId of [sourceAccount.id, destinationAccount.id]) {
      const response = await accountCrud.remove(
        new Request(`http://localhost/api/accounts/${accountId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: accountId }) }
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.message).toBe("Conta possui transações vinculadas");
    }

    const [accounts, persistedTransfer, legs] = await Promise.all([
      prisma.account.count({
        where: { id: { in: [sourceAccount.id, destinationAccount.id] } }, userId: owner.id },
      }),
      prisma.transfer.findUnique({ where: { id: transfer.id } }),
      prisma.transaction.findMany({
        where: { transferId: transfer.id },
        orderBy: { transferRole: "asc" },
      }),
    ]);

    expect(accounts).toBe(2);
    expect(persistedTransfer).not.toBeNull();
    expect(legs).toHaveLength(2);
  });

  it("keeps deletion available for an empty account", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Empty Account Owner",
        email: `empty-account-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);

    const account = await prisma.account.create({
      data: {
        name: `Vazia ${suffix}`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: owner.id,
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await accountCrud.remove(
      new Request(`http://localhost/api/accounts/${account.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: account.id }) }
    );

    expect(response.status).toBe(200);
    expect(await prisma.account.findUnique({ where: { id: account.id } })).toBeNull();
  });
});
