import { Prisma } from "@prisma/client";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

const accountSelect = {
  id: true,
  name: true,
  currency: true,
  type: true,
  color: true,
  icon: true,
} satisfies Prisma.AccountSelect;

const transferReadInclude = {
  transactions: {
    include: {
      account: { select: accountSelect },
    },
  },
} satisfies Prisma.TransferInclude;

type TransferReadModel = Prisma.TransferGetPayload<{
  include: typeof transferReadInclude;
}>;

type TransferLeg = TransferReadModel["transactions"][number];

function requirePair(transfer: TransferReadModel) {
  const source = transfer.transactions.find((item) => item.transferRole === "SOURCE");
  const destination = transfer.transactions.find(
    (item) => item.transferRole === "DESTINATION",
  );

  if (
    transfer.transactions.length !== 2 ||
    !source ||
    !destination ||
    source.kind !== "TRANSFER" ||
    destination.kind !== "TRANSFER" ||
    source.type !== "EXPENSE" ||
    destination.type !== "INCOME" ||
    source.accountId === destination.accountId ||
    source.amount !== destination.amount ||
    source.year !== destination.year ||
    source.month !== destination.month ||
    source.day !== destination.day ||
    source.description !== destination.description ||
    source.status !== destination.status ||
    source.account.currency !== destination.account.currency
  ) {
    throw new HttpError("Transferência inconsistente", 409);
  }

  return { source, destination };
}

function toLegDTO(leg: TransferLeg, counterpart: TransferLeg) {
  return {
    transactionId: leg.id,
    reconciliationStatus: leg.reconciliationStatus,
    reconciledAt: leg.reconciledAt?.toISOString() ?? null,
    account: leg.account,
    counterpartAccount: counterpart.account,
  };
}

export function toTransferReadDTO(transfer: TransferReadModel) {
  const { source, destination } = requirePair(transfer);

  return {
    id: transfer.id,
    amountCents: source.amount,
    currency: source.account.currency,
    year: source.year,
    month: source.month,
    day: source.day,
    description: source.description,
    status: source.status,
    source: toLegDTO(source, destination),
    destination: toLegDTO(destination, source),
    createdAt: transfer.createdAt.toISOString(),
    updatedAt: transfer.updatedAt.toISOString(),
  };
}

export async function listTransfersForUser(userId: string) {
  const transfers = await prisma.transfer.findMany({
    where: { userId, deletedAt: null },
    include: transferReadInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return transfers.map(toTransferReadDTO);
}

export async function getTransferForUser(userId: string, transferId: string) {
  const transfer = await prisma.transfer.findFirst({
    where: { id: transferId, userId, deletedAt: null },
    include: transferReadInclude,
  });

  if (!transfer) {
    throw new HttpError("Transferência não encontrada", 404);
  }

  return toTransferReadDTO(transfer);
}
