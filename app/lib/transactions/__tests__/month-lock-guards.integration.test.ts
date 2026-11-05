import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { MONTH_LOCKED_CODE } from "@/app/lib/monthly-closing/month-lock";
import { prisma } from "@/app/lib/prisma";
import { updateTransactionStatus } from "@/app/lib/transactions/transaction-status";
import {
  createTransferForUser,
} from "@/app/lib/transfers/create-transfer";
import {
  deleteTransferForUser,
  updateTransferForUser,
} from "@/app/lib/transfers/lifecycle-transfer";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function setup() {
  const owner = await fixtures.user({ name: "Lock Owner" });
  const source = await fixtures.account(owner.id, { name: "Origem", currency: "BRL" });
  const destination = await fixtures.account(owner.id, { name: "Destino", currency: "BRL" });
  const category = await fixtures.category(owner.id, { name: "Despesa lock", type: "EXPENSE" });
  const transaction = await prisma.transaction.create({
    data: {
      userId: owner.id,
      accountId: source.id,
      categoryId: category.id,
      amount: 5_000,
      type: "EXPENSE",
      description: "Lançamento",
      status: "PENDING",
      year: 2028,
      month: 4,
      day: 10,
    },
  });
  authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
  return { owner, source, destination, transaction };
}

function lock(userId: string, year: number, month: number) {
  return prisma.lockedMonth.create({ data: { userId, year, month } });
}

function patchStatus(id: string, status: string) {
  return updateTransactionStatus(
    new Request(`http://localhost/api/transactions/${id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("trava de mês nos caminhos de gravação", () => {
  it("bloqueia mudar o status em mês travado e libera ao reabrir", async () => {
    const { owner, transaction } = await setup();
    await lock(owner.id, 2028, 4);

    const blocked = await patchStatus(transaction.id, "COMPLETED");
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).error.code).toBe(MONTH_LOCKED_CODE);
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(stored.status).toBe("PENDING");

    await prisma.lockedMonth.deleteMany({ where: { userId: owner.id } });
    expect((await patchStatus(transaction.id, "COMPLETED")).status).toBe(200);
  });

  it("não é afetado por outro mês travado", async () => {
    const { owner, transaction } = await setup();
    await lock(owner.id, 2028, 3);
    expect((await patchStatus(transaction.id, "COMPLETED")).status).toBe(200);
  });

  it("bloqueia criar, mover e remover transferência em mês travado", async () => {
    const { owner, source, destination } = await setup();
    const input = {
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amountCents: 1_000,
      year: 2028,
      month: 5,
      day: 3,
      description: "Transferência lock",
      status: "COMPLETED" as const,
    };

    const created = await createTransferForUser(owner.id, input, "lock-open-1");
    await lock(owner.id, 2028, 5);

    await expect(
      createTransferForUser(owner.id, input, "lock-blocked-1"),
    ).rejects.toMatchObject({ status: 409, code: MONTH_LOCKED_CODE });
    await expect(
      updateTransferForUser(owner.id, created.id, { amountCents: 2_000 }),
    ).rejects.toMatchObject({ status: 409, code: MONTH_LOCKED_CODE });
    await expect(
      updateTransferForUser(owner.id, created.id, { month: 6 }),
    ).rejects.toMatchObject({ status: 409, code: MONTH_LOCKED_CODE });
    await expect(
      deleteTransferForUser(owner.id, created.id),
    ).rejects.toMatchObject({ status: 409, code: MONTH_LOCKED_CODE });

    expect(await prisma.transaction.count({ where: { userId: owner.id, kind: "TRANSFER" } })).toBe(2);
  });
});
