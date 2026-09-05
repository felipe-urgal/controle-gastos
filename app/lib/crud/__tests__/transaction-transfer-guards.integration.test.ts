import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { withDerivedAccountBalance } from "@/app/lib/accounts/account-balance";
import {
  completePendingTransaction,
  transactionCrud,
} from "@/app/lib/crud/transaction.crud";

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

describe("transaction transfer guards", () => {
  it("blocks isolated mutations and keeps transfers out of operational summary", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Transfer Owner",
        email: `transfer-guards-${suffix}@example.com`,
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

    const transfer = await prisma.transfer.create({
      data: { userId: owner.id },
    });

    const [sourceLeg, destinationLeg] = await Promise.all([
      prisma.transaction.create({
        data: {
          amount: 5_000,
          type: "EXPENSE",
          kind: "TRANSFER",
          transferId: transfer.id,
          transferRole: "SOURCE",
          description: "Transferência interna",
          status: "PENDING",
          year: 2030,
          month: 1,
          day: 10,
          accountId: sourceAccount.id,
          categoryId: null,
          userId: owner.id,
        },
      }),
      prisma.transaction.create({
        data: {
          amount: 5_000,
          type: "INCOME",
          kind: "TRANSFER",
          transferId: transfer.id,
          transferRole: "DESTINATION",
          description: "Transferência interna",
          status: "PENDING",
          year: 2030,
          month: 1,
          day: 10,
          accountId: destinationAccount.id,
          categoryId: null,
          userId: owner.id,
        },
      }),
    ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const updateResponse = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${sourceLeg.id}`, {
        method: "PUT",
        body: JSON.stringify({ description: "Tentativa isolada" }),
      }),
      { params: Promise.resolve({ id: sourceLeg.id }) }
    );
    expect(updateResponse.status).toBe(400);

    const deleteResponse = await transactionCrud.remove(
      new Request(`http://localhost/api/transactions/${sourceLeg.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: sourceLeg.id }) }
    );
    expect(deleteResponse.status).toBe(400);

    const completeResponse = await completePendingTransaction(
      new Request(`http://localhost/api/transactions/${sourceLeg.id}/complete`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: sourceLeg.id }) }
    );
    expect(completeResponse.status).toBe(404);

    const unchanged = await prisma.transaction.findUnique({
      where: { id: sourceLeg.id },
    });
    expect(unchanged?.status).toBe("PENDING");
    expect(unchanged?.description).toBe("Transferência interna");

    await prisma.transaction.updateMany({
      where: { transferId: transfer.id },
      data: { status: "COMPLETED" },
    });

    const [sourceBalance, destinationBalance, listResponse] = await Promise.all([
      withDerivedAccountBalance(sourceAccount, owner.id),
      withDerivedAccountBalance(destinationAccount, owner.id),
      transactionCrud.list(
        new Request("http://localhost/api/transactions?year=2030&month=1")
      ),
    ]);
    const listBody = await listResponse.json();

    expect(sourceBalance.balance).toBe(-5_000);
    expect(destinationBalance.balance).toBe(5_000);
    expect(listBody.data.items).toHaveLength(2);
    expect(listBody.data.summary).toEqual([]);

    const destinationStillExists = await prisma.transaction.findUnique({
      where: { id: destinationLeg.id },
    });
    expect(destinationStillExists).not.toBeNull();
  });
});
