import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import {
  completePendingTransaction,
  transactionCrud,
} from "@/app/lib/crud/transaction.crud";
import { toTransactionDTO } from "@/app/lib/mappers/transaction.mapper";
import { getDuplicateTransactionValues } from "@/app/lib/transactions/transaction-quick-actions";
import { withDerivedAccountBalance } from "@/app/lib/accounts/account-balance";

const createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("transaction quick action integration", () => {
  it("duplicates only after confirmation and completes only the owner's pending transaction", async () => {
    const suffix = randomUUID();
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Owner",
          email: `quick-owner-${suffix}@example.com`,
          password: "test-hash",
        },
      }),
      prisma.user.create({
        data: {
          name: "Other",
          email: `quick-other-${suffix}@example.com`,
          password: "test-hash",
        },
      }),
    ]);
    createdUserIds.push(owner.id, otherUser.id);

    const account = await prisma.account.create({
      data: {
        name: `Conta ${suffix}`,
        type: "CREDIT_DEBIT",
        userId: owner.id,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: `Categoria ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: owner.id,
      },
    });
    const original = await prisma.transaction.create({
      data: {
        amount: 4200,
        type: "EXPENSE",
        description: "Compra pendente",
        status: "PENDING",
        year: 2026,
        month: 8,
        day: 30,
        accountId: account.id,
        categoryId: category.id,
        userId: owner.id,
      },
      include: {
        account: true,
        category: true,
      },
    });

    const duplicateValues = getDuplicateTransactionValues(
      toTransactionDTO(original)
    );

    expect(
      await prisma.transaction.count({ where: { userId: owner.id } })
    ).toBe(1);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const duplicateResponse = await transactionCrud.create(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          ...duplicateValues,
          type: "INCOME",
        }),
      })
    );
    const duplicateBody = await duplicateResponse.json();

    expect(duplicateResponse.status).toBe(201);
    expect(duplicateBody.data.id).not.toBe(original.id);
    expect(duplicateBody.data.type).toBe("EXPENSE");
    expect(
      await prisma.transaction.count({ where: { userId: owner.id } })
    ).toBe(2);

    const beforeBalance = await withDerivedAccountBalance(account, owner.id);
    expect(beforeBalance.balance).toBe(0);

    authMocks.getAuthenticatedUserId.mockResolvedValue(otherUser.id);
    const deniedResponse = await completePendingTransaction(
      new Request(`http://localhost/api/transactions/${original.id}/complete`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: original.id }) }
    );
    expect(deniedResponse.status).toBe(404);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const completeResponse = await completePendingTransaction(
      new Request(`http://localhost/api/transactions/${original.id}/complete`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: original.id }) }
    );
    expect(completeResponse.status).toBe(200);

    const [completed, duplicate, afterBalance, listResponse] = await Promise.all([
      prisma.transaction.findUnique({ where: { id: original.id } }),
      prisma.transaction.findUnique({ where: { id: duplicateBody.data.id } }),
      withDerivedAccountBalance(account, owner.id),
      transactionCrud.list(
        new Request("http://localhost/api/transactions?year=2026&month=8")
      ),
    ]);
    const listBody = await listResponse.json();

    expect(completed?.status).toBe("COMPLETED");
    expect(duplicate?.status).toBe("PENDING");
    expect(afterBalance.balance).toBe(-4200);
    expect(listBody.data.summary).toEqual({
      income: 0,
      expense: 4200,
      balance: -4200,
    });
  });
});
