import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { withDerivedAccountBalance } from "@/app/lib/accounts/account-balance";
import { prisma } from "@/app/lib/prisma";
import { createTransferForUser } from "@/app/lib/transfers/create-transfer";
import {
  deleteTransferForUser,
  updateTransferForUser,
} from "@/app/lib/transfers/lifecycle-transfer";

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

async function createUser(label: string) {
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `transfer-lifecycle-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createAccounts(userId: string, prefix: string) {
  return Promise.all([
    prisma.account.create({
      data: {
        name: `${prefix} Origem`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId,
      },
    }),
    prisma.account.create({
      data: {
        name: `${prefix} Destino`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId,
      },
    }),
  ]);
}

function transferInput(
  sourceAccountId: string,
  destinationAccountId: string,
  status: "PENDING" | "COMPLETED" = "COMPLETED",
) {
  return {
    sourceAccountId,
    destinationAccountId,
    amountCents: 10_000,
    year: 2030,
    month: 1,
    day: 31,
    description: "Reserva mensal",
    status,
  } as const;
}

async function createTransfer(
  userId: string,
  sourceAccountId: string,
  destinationAccountId: string,
  status: "PENDING" | "COMPLETED" = "COMPLETED",
  idempotencyKey = randomUUID(),
) {
  return createTransferForUser(
    userId,
    transferInput(sourceAccountId, destinationAccountId, status),
    idempotencyKey,
  );
}

async function getLegs(transferId: string) {
  return prisma.transaction.findMany({
    where: { transferId },
    orderBy: { transferRole: "asc" },
  });
}

describe("transfer lifecycle", () => {
  it("updates value, date, description and status on both legs atomically", async () => {
    const owner = await createUser("Lifecycle owner");
    const [source, destination] = await createAccounts(owner.id, "Update");
    const transfer = await createTransfer(
      owner.id,
      source.id,
      destination.id,
      "PENDING",
    );

    const result = await updateTransferForUser(owner.id, transfer.id, {
      amountCents: 25_500,
      year: 2030,
      month: 2,
      day: 28,
      description: "Reserva atualizada",
      status: "COMPLETED",
    });
    const legs = await getLegs(transfer.id);

    expect(result).toMatchObject({
      id: transfer.id,
      amountCents: 25_500,
      year: 2030,
      month: 2,
      day: 28,
      description: "Reserva atualizada",
      status: "COMPLETED",
    });
    expect(legs).toHaveLength(2);
    expect(
      legs.every(
        (leg) =>
          leg.amount === 25_500 &&
          leg.year === 2030 &&
          leg.month === 2 &&
          leg.day === 28 &&
          leg.description === "Reserva atualizada" &&
          leg.status === "COMPLETED" &&
          leg.reconciliationStatus === "UNCLEARED",
      ),
    ).toBe(true);

    await expect(withDerivedAccountBalance(source, owner.id)).resolves.toMatchObject({
      balance: -25_500,
    });
    await expect(
      withDerivedAccountBalance(destination, owner.id),
    ).resolves.toMatchObject({ balance: 25_500 });
  });

  it("cancels both legs and removes their realized balance effect", async () => {
    const owner = await createUser("Cancel owner");
    const [source, destination] = await createAccounts(owner.id, "Cancel");
    const transfer = await createTransfer(owner.id, source.id, destination.id);

    await prisma.transaction.updateMany({
      where: { transferId: transfer.id },
      data: { reconciliationStatus: "CLEARED" },
    });

    await updateTransferForUser(owner.id, transfer.id, { status: "CANCELLED" });
    const legs = await getLegs(transfer.id);

    expect(legs).toHaveLength(2);
    expect(
      legs.every(
        (leg) =>
          leg.status === "CANCELLED" &&
          leg.reconciliationStatus === "UNCLEARED" &&
          leg.reconciledAt === null,
      ),
    ).toBe(true);
    await expect(withDerivedAccountBalance(source, owner.id)).resolves.toMatchObject({
      balance: 0,
    });
    await expect(
      withDerivedAccountBalance(destination, owner.id),
    ).resolves.toMatchObject({ balance: 0 });
  });

  it("clears CLEARED state when financial fields change", async () => {
    const owner = await createUser("Cleared owner");
    const [source, destination] = await createAccounts(owner.id, "Cleared");
    const transfer = await createTransfer(owner.id, source.id, destination.id);

    await prisma.transaction.updateMany({
      where: { transferId: transfer.id },
      data: { reconciliationStatus: "CLEARED" },
    });

    await updateTransferForUser(owner.id, transfer.id, {
      amountCents: 10_001,
    });
    const legs = await getLegs(transfer.id);

    expect(
      legs.every((leg) => leg.reconciliationStatus === "UNCLEARED"),
    ).toBe(true);
  });

  it("removes both legs and keeps a tombstone for the logical transfer", async () => {
    const owner = await createUser("Delete owner");
    const [source, destination] = await createAccounts(owner.id, "Delete");
    const transfer = await createTransfer(owner.id, source.id, destination.id);

    const deleted = await deleteTransferForUser(owner.id, transfer.id);
    const tombstone = await prisma.transfer.findUnique({
      where: { id: transfer.id },
    });

    expect(deleted.id).toBe(transfer.id);
    expect(tombstone?.deletedAt).toBeInstanceOf(Date);
    expect(await prisma.transaction.count({ where: { transferId: transfer.id } })).toBe(0);
    await expect(
      updateTransferForUser(owner.id, transfer.id, { amountCents: 20_000 }),
    ).rejects.toThrow("Transferência não encontrada");
    await expect(deleteTransferForUser(owner.id, transfer.id)).rejects.toThrow(
      "Transferência não encontrada",
    );
    await expect(withDerivedAccountBalance(source, owner.id)).resolves.toMatchObject({
      balance: 0,
    });
    await expect(
      withDerivedAccountBalance(destination, owner.id),
    ).resolves.toMatchObject({ balance: 0 });
  });

  it("does not recreate a deleted transfer when the original POST is retried", async () => {
    const owner = await createUser("Retry after delete owner");
    const [source, destination] = await createAccounts(owner.id, "Retry delete");
    const idempotencyKey = randomUUID();
    const input = transferInput(source.id, destination.id);
    const transfer = await createTransferForUser(
      owner.id,
      input,
      idempotencyKey,
    );

    await deleteTransferForUser(owner.id, transfer.id);

    await expect(
      createTransferForUser(owner.id, input, idempotencyKey),
    ).rejects.toThrow("Transferência já removida");

    expect(
      await prisma.transfer.count({
        where: { userId: owner.id },
      }),
    ).toBe(1);
    expect(await getLegs(transfer.id)).toHaveLength(0);
    expect(
      (
        await prisma.transfer.findUnique({
          where: { id: transfer.id },
        })
      )?.deletedAt,
    ).toBeInstanceOf(Date);
  });

  it("does not expose or mutate another user's transfer", async () => {
    const owner = await createUser("Owner");
    const foreign = await createUser("Foreign");
    const [source, destination] = await createAccounts(owner.id, "Owned");
    const transfer = await createTransfer(owner.id, source.id, destination.id);

    await expect(
      updateTransferForUser(foreign.id, transfer.id, { amountCents: 99_999 }),
    ).rejects.toThrow("Transferência não encontrada");
    await expect(deleteTransferForUser(foreign.id, transfer.id)).rejects.toThrow(
      "Transferência não encontrada",
    );

    const legs = await getLegs(transfer.id);
    expect(legs).toHaveLength(2);
    expect(legs.every((leg) => leg.amount === 10_000)).toBe(true);
    expect(
      await prisma.transfer.findUnique({ where: { id: transfer.id } }),
    ).not.toBeNull();
  });

  it("blocks update and delete when either leg is reconciled", async () => {
    const owner = await createUser("Reconciled owner");
    const [source, destination] = await createAccounts(owner.id, "Reconciled");
    const transfer = await createTransfer(owner.id, source.id, destination.id);

    await prisma.transaction.update({
      where: { id: transfer.sourceTransactionId },
      data: {
        reconciliationStatus: "RECONCILED",
        reconciledAt: new Date(),
      },
    });

    await expect(
      updateTransferForUser(owner.id, transfer.id, { description: "Não alterar" }),
    ).rejects.toThrow("desfazer a reconciliação");
    await expect(deleteTransferForUser(owner.id, transfer.id)).rejects.toThrow(
      "desfazer a reconciliação",
    );

    expect(await getLegs(transfer.id)).toHaveLength(2);
    expect(
      await prisma.transfer.findUnique({ where: { id: transfer.id } }),
    ).not.toBeNull();
  });

  it("fails closed for an incomplete pair instead of repairing or deleting it", async () => {
    const owner = await createUser("Broken owner");
    const [source, destination] = await createAccounts(owner.id, "Broken");
    const transfer = await createTransfer(owner.id, source.id, destination.id);

    await prisma.transaction.delete({
      where: { id: transfer.destinationTransactionId },
    });

    await expect(
      updateTransferForUser(owner.id, transfer.id, { amountCents: 12_000 }),
    ).rejects.toThrow("Transferência inconsistente");
    await expect(deleteTransferForUser(owner.id, transfer.id)).rejects.toThrow(
      "Transferência inconsistente",
    );

    expect(await getLegs(transfer.id)).toHaveLength(1);
    expect(
      await prisma.transfer.findUnique({ where: { id: transfer.id } }),
    ).toMatchObject({ deletedAt: null });
  });

  it("rolls back when a partial date update would create an invalid date", async () => {
    const owner = await createUser("Date owner");
    const [source, destination] = await createAccounts(owner.id, "Date");
    const transfer = await createTransfer(owner.id, source.id, destination.id);

    await expect(
      updateTransferForUser(owner.id, transfer.id, { month: 2 }),
    ).rejects.toThrow("Data inválida");

    const legs = await getLegs(transfer.id);
    expect(
      legs.every(
        (leg) =>
          leg.amount === 10_000 &&
          leg.year === 2030 &&
          leg.month === 1 &&
          leg.day === 31 &&
          leg.description === "Reserva mensal" &&
          leg.status === "COMPLETED",
      ),
    ).toBe(true);
  });
});
