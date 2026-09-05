import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { withDerivedAccountBalance } from "@/app/lib/accounts/account-balance";
import { transactionCrud } from "@/app/lib/crud/transaction.crud";
import { prisma } from "@/app/lib/prisma";
import { updateTransactionReconciliation } from "@/app/lib/transactions/reconciliation";

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

async function createFixture() {
  const suffix = randomUUID();
  const [owner, otherUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Reconciliation Owner",
        email: `reconciliation-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Reconciliation Other",
        email: `reconciliation-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  createdUserIds.push(owner.id, otherUser.id);

  const [sourceAccount, destinationAccount, category] = await Promise.all([
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
    prisma.category.create({
      data: {
        name: `Despesa ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: owner.id,
      },
    }),
  ]);

  const completed = await prisma.transaction.create({
    data: {
      amount: 12_345,
      type: "EXPENSE",
      description: "Compra conferível",
      status: "COMPLETED",
      year: 2026,
      month: 9,
      day: 5,
      accountId: sourceAccount.id,
      categoryId: category.id,
      userId: owner.id,
    },
  });

  const pending = await prisma.transaction.create({
    data: {
      amount: 2_000,
      type: "EXPENSE",
      description: "Compra pendente",
      status: "PENDING",
      year: 2026,
      month: 9,
      day: 6,
      accountId: sourceAccount.id,
      categoryId: category.id,
      userId: owner.id,
    },
  });

  return {
    owner,
    otherUser,
    sourceAccount,
    destinationAccount,
    category,
    completed,
    pending,
  };
}

function reconciliationRequest(id: string, status: "UNCLEARED" | "CLEARED") {
  return new Request(`http://localhost/api/transactions/${id}/reconciliation`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

describe("transaction reconciliation integration", () => {
  it("marks a completed transaction cleared idempotently without changing realized balance", async () => {
    const { owner, otherUser, sourceAccount, completed } = await createFixture();
    const before = await withDerivedAccountBalance(sourceAccount, owner.id);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const first = await updateTransactionReconciliation(
      reconciliationRequest(completed.id, "CLEARED"),
      { params: Promise.resolve({ id: completed.id }) },
    );
    const firstBody = await first.json();

    expect(first.status).toBe(200);
    expect(firstBody.data).toMatchObject({
      id: completed.id,
      reconciliationStatus: "CLEARED",
      reconciledAt: null,
    });

    const retry = await updateTransactionReconciliation(
      reconciliationRequest(completed.id, "CLEARED"),
      { params: Promise.resolve({ id: completed.id }) },
    );
    expect(retry.status).toBe(200);

    const after = await withDerivedAccountBalance(sourceAccount, owner.id);
    const stored = await prisma.transaction.findUnique({ where: { id: completed.id } });

    expect(stored?.reconciliationStatus).toBe("CLEARED");
    expect(stored?.reconciledAt).toBeNull();
    expect(after.balance).toBe(before.balance);
    expect(after.balance).toBe(-12_345);

    authMocks.getAuthenticatedUserId.mockResolvedValue(otherUser.id);
    const denied = await updateTransactionReconciliation(
      reconciliationRequest(completed.id, "UNCLEARED"),
      { params: Promise.resolve({ id: completed.id }) },
    );
    expect(denied.status).toBe(404);
  });

  it("rejects pending transactions and keeps their reconciliation state untouched", async () => {
    const { owner, pending } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const response = await updateTransactionReconciliation(
      reconciliationRequest(pending.id, "CLEARED"),
      { params: Promise.resolve({ id: pending.id }) },
    );

    expect(response.status).toBe(400);
    expect(
      await prisma.transaction.findUnique({
        where: { id: pending.id },
        select: { reconciliationStatus: true, reconciledAt: true },
      }),
    ).toEqual({ reconciliationStatus: "UNCLEARED", reconciledAt: null });
  });

  it("reconciles transfer legs independently per account without changing either balance", async () => {
    const { owner, sourceAccount, destinationAccount } = await createFixture();
    const transfer = await prisma.transfer.create({ data: { userId: owner.id } });

    const [sourceLeg, destinationLeg] = await Promise.all([
      prisma.transaction.create({
        data: {
          amount: 5_000,
          type: "EXPENSE",
          kind: "TRANSFER",
          transferId: transfer.id,
          transferRole: "SOURCE",
          description: "Transferência entre contas",
          status: "COMPLETED",
          year: 2026,
          month: 9,
          day: 5,
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
          description: "Transferência entre contas",
          status: "COMPLETED",
          year: 2026,
          month: 9,
          day: 5,
          accountId: destinationAccount.id,
          categoryId: null,
          userId: owner.id,
        },
      }),
    ]);

    const [sourceBefore, destinationBefore] = await Promise.all([
      withDerivedAccountBalance(sourceAccount, owner.id),
      withDerivedAccountBalance(destinationAccount, owner.id),
    ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await updateTransactionReconciliation(
      reconciliationRequest(sourceLeg.id, "CLEARED"),
      { params: Promise.resolve({ id: sourceLeg.id }) },
    );
    expect(response.status).toBe(200);

    const [sourceStored, destinationStored, sourceAfter, destinationAfter] = await Promise.all([
      prisma.transaction.findUnique({
        where: { id: sourceLeg.id },
        select: { reconciliationStatus: true },
      }),
      prisma.transaction.findUnique({
        where: { id: destinationLeg.id },
        select: { reconciliationStatus: true },
      }),
      withDerivedAccountBalance(sourceAccount, owner.id),
      withDerivedAccountBalance(destinationAccount, owner.id),
    ]);

    expect(sourceStored?.reconciliationStatus).toBe("CLEARED");
    expect(destinationStored?.reconciliationStatus).toBe("UNCLEARED");
    expect(sourceAfter.balance).toBe(sourceBefore.balance);
    expect(destinationAfter.balance).toBe(destinationBefore.balance);
  });

  it("blocks normal reconciliation, edit and delete flows for a reconciled transaction", async () => {
    const { owner, sourceAccount, category } = await createFixture();
    const reconciled = await prisma.transaction.create({
      data: {
        amount: 7_000,
        type: "EXPENSE",
        description: "Fechada no extrato",
        status: "COMPLETED",
        reconciliationStatus: "RECONCILED",
        reconciledAt: new Date("2026-09-05T12:00:00.000Z"),
        year: 2026,
        month: 9,
        day: 5,
        accountId: sourceAccount.id,
        categoryId: category.id,
        userId: owner.id,
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const reconciliationResponse = await updateTransactionReconciliation(
      reconciliationRequest(reconciled.id, "UNCLEARED"),
      { params: Promise.resolve({ id: reconciled.id }) },
    );
    expect(reconciliationResponse.status).toBe(409);

    const updateResponse = await transactionCrud.update(
      new Request(`http://localhost/api/transactions/${reconciled.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "Tentativa de alteração" }),
      }),
      { params: Promise.resolve({ id: reconciled.id }) },
    );
    expect(updateResponse.status).toBe(409);

    const deleteResponse = await transactionCrud.remove(
      new Request(`http://localhost/api/transactions/${reconciled.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: reconciled.id }) },
    );
    expect(deleteResponse.status).toBe(400);

    expect(
      await prisma.transaction.findUnique({
        where: { id: reconciled.id },
        select: { description: true, reconciliationStatus: true },
      }),
    ).toEqual({
      description: "Fechada no extrato",
      reconciliationStatus: "RECONCILED",
    });
  });
});
