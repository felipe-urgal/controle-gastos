import { Prisma } from "@prisma/client";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import type { UpdateTransferInput } from "@/app/schemas/transfer.schema";

const transferLifecycleInclude = {
  transactions: {
    include: {
      account: {
        select: { currency: true },
      },
    },
  },
} satisfies Prisma.TransferInclude;

type TransferWithLegs = Prisma.TransferGetPayload<{
  include: typeof transferLifecycleInclude;
}>;

type TransferLeg = TransferWithLegs["transactions"][number];

type TransferPair = {
  source: TransferLeg;
  destination: TransferLeg;
};

function assertValidCalendarDate(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) {
    throw new HttpError("Data inválida", 400);
  }
}

function assertConsistentPair(transfer: TransferWithLegs): TransferPair {
  const source = transfer.transactions.find(
    (transaction) => transaction.transferRole === "SOURCE",
  );
  const destination = transfer.transactions.find(
    (transaction) => transaction.transferRole === "DESTINATION",
  );

  if (
    transfer.transactions.length !== 2 ||
    !source ||
    !destination ||
    source.kind !== "TRANSFER" ||
    destination.kind !== "TRANSFER" ||
    source.type !== "EXPENSE" ||
    destination.type !== "INCOME" ||
    source.categoryId !== null ||
    destination.categoryId !== null ||
    source.transferId !== transfer.id ||
    destination.transferId !== transfer.id ||
    source.userId !== transfer.userId ||
    destination.userId !== transfer.userId ||
    source.accountId === destination.accountId ||
    source.account.currency !== destination.account.currency ||
    source.amount !== destination.amount ||
    source.year !== destination.year ||
    source.month !== destination.month ||
    source.day !== destination.day ||
    source.description !== destination.description ||
    source.status !== destination.status
  ) {
    throw new HttpError(
      "Transferência inconsistente; nenhuma alteração foi aplicada",
      409,
    );
  }

  return { source, destination };
}

function assertMutablePair({ source, destination }: TransferPair) {
  if (
    source.reconciliationStatus === "RECONCILED" ||
    destination.reconciliationStatus === "RECONCILED"
  ) {
    throw new HttpError(
      "Transferência reconciliada exige desfazer a reconciliação antes de alterações",
      409,
    );
  }
}

async function findOwnedTransfer(
  tx: Prisma.TransactionClient,
  userId: string,
  transferId: string,
) {
  const transfer = await tx.transfer.findFirst({
    where: { id: transferId, userId },
    include: transferLifecycleInclude,
  });

  if (!transfer) {
    throw new HttpError("Transferência não encontrada", 404);
  }

  return transfer;
}

function toTransferResult(
  transfer: TransferWithLegs,
  { source, destination }: TransferPair,
) {
  return {
    id: transfer.id,
    currency: source.account.currency,
    sourceTransactionId: source.id,
    destinationTransactionId: destination.id,
    amountCents: source.amount,
    year: source.year,
    month: source.month,
    day: source.day,
    description: source.description,
    status: source.status,
  };
}

export async function updateTransferForUser(
  userId: string,
  transferId: string,
  input: UpdateTransferInput,
) {
  return prisma.$transaction(async (tx) => {
    const transfer = await findOwnedTransfer(tx, userId, transferId);
    const pair = assertConsistentPair(transfer);
    assertMutablePair(pair);

    const next = {
      amount: input.amountCents ?? pair.source.amount,
      year: input.year ?? pair.source.year,
      month: input.month ?? pair.source.month,
      day: input.day ?? pair.source.day,
      description: input.description ?? pair.source.description,
      status: input.status ?? pair.source.status,
    };

    assertValidCalendarDate(next.year, next.month, next.day);

    const invalidatesReconciliation =
      input.amountCents !== undefined ||
      input.year !== undefined ||
      input.month !== undefined ||
      input.day !== undefined ||
      input.description !== undefined ||
      (input.status !== undefined && input.status !== pair.source.status);

    const updated = await tx.transaction.updateMany({
      where: {
        id: { in: [pair.source.id, pair.destination.id] },
        userId,
        transferId,
        kind: "TRANSFER",
      },
      data: {
        amount: next.amount,
        year: next.year,
        month: next.month,
        day: next.day,
        description: next.description,
        status: next.status,
        ...(invalidatesReconciliation
          ? {
              reconciliationStatus: "UNCLEARED" as const,
              reconciledAt: null,
            }
          : {}),
      },
    });

    if (updated.count !== 2) {
      throw new HttpError(
        "Transferência mudou durante a atualização; nenhuma alteração foi aplicada",
        409,
      );
    }

    return {
      id: transfer.id,
      currency: pair.source.account.currency,
      sourceTransactionId: pair.source.id,
      destinationTransactionId: pair.destination.id,
      amountCents: next.amount,
      year: next.year,
      month: next.month,
      day: next.day,
      description: next.description,
      status: next.status,
    };
  });
}

export async function deleteTransferForUser(
  userId: string,
  transferId: string,
) {
  return prisma.$transaction(async (tx) => {
    const transfer = await findOwnedTransfer(tx, userId, transferId);
    const pair = assertConsistentPair(transfer);
    assertMutablePair(pair);

    const deleted = await tx.transfer.deleteMany({
      where: { id: transferId, userId },
    });

    if (deleted.count !== 1) {
      throw new HttpError(
        "Transferência mudou durante a remoção; nenhuma alteração foi aplicada",
        409,
      );
    }

    return toTransferResult(transfer, pair);
  });
}
