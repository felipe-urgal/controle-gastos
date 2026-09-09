import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import type { CreateTransferInput } from "@/app/schemas/transfer.schema";

const transferReplayInclude = {
  transactions: {
    include: {
      account: {
        select: { currency: true },
      },
    },
  },
} satisfies Prisma.TransferInclude;

type TransferWithLegs = Prisma.TransferGetPayload<{
  include: typeof transferReplayInclude;
}>;

type TransferReader = Pick<Prisma.TransactionClient, "transfer">;

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeIdempotencyKey(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) {
    throw new HttpError("Chave de idempotência inválida", 400);
  }
  return normalized;
}

function hashTransferInput(input: CreateTransferInput) {
  return sha256(
    JSON.stringify({
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      amountCents: input.amountCents,
      year: input.year,
      month: input.month,
      day: input.day,
      description: input.description,
      status: input.status,
    }),
  );
}

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

function assertReplayableIdempotentRequest(
  transfer: Pick<TransferWithLegs, "requestHash" | "deletedAt">,
  requestHash: string,
) {
  if (transfer.requestHash !== requestHash) {
    throw new HttpError(
      "Chave de idempotência já utilizada com outro payload",
      409,
    );
  }

  if (transfer.deletedAt) {
    throw new HttpError(
      "Transferência já removida para esta chave de idempotência",
      409,
    );
  }
}

function toTransferResult(transfer: TransferWithLegs, replayed: boolean) {
  const sourceLeg = transfer.transactions.find(
    (transaction) => transaction.transferRole === "SOURCE",
  );
  const destinationLeg = transfer.transactions.find(
    (transaction) => transaction.transferRole === "DESTINATION",
  );

  if (
    transfer.transactions.length !== 2 ||
    !sourceLeg ||
    !destinationLeg ||
    sourceLeg.status !== destinationLeg.status ||
    sourceLeg.account.currency !== destinationLeg.account.currency
  ) {
    throw new HttpError("Não foi possível recuperar a transferência", 500);
  }

  return {
    id: transfer.id,
    currency: sourceLeg.account.currency,
    sourceTransactionId: sourceLeg.id,
    destinationTransactionId: destinationLeg.id,
    status: sourceLeg.status,
    replayed,
  };
}

async function findIdempotentTransfer(
  db: TransferReader,
  userId: string,
  idempotencyKeyHash: string,
) {
  return db.transfer.findFirst({
    where: { userId, idempotencyKeyHash },
    include: transferReplayInclude,
  });
}

export async function createTransferForUser(
  userId: string,
  input: CreateTransferInput,
  idempotencyKey: string,
) {
  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
  const idempotencyKeyHash = sha256(normalizedIdempotencyKey);
  const requestHash = hashTransferInput(input);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await findIdempotentTransfer(
        tx,
        userId,
        idempotencyKeyHash,
      );
      if (existing) {
        assertReplayableIdempotentRequest(existing, requestHash);
        return toTransferResult(existing, true);
      }

      // Para uma chave nova, todas as invariantes de domínio continuam sendo
      // verificadas antes de persistir o parent ou qualquer leg.
      if (input.sourceAccountId === input.destinationAccountId) {
        throw new HttpError(
          "As contas de origem e destino devem ser diferentes",
          400,
        );
      }
      assertValidCalendarDate(input.year, input.month, input.day);

      const accounts = await tx.account.findMany({
        where: {
          userId,
          isActive: true,
          id: { in: [input.sourceAccountId, input.destinationAccountId] },
        },
        select: { id: true, currency: true },
      });

      // Uma resposta única evita revelar se um id pertence a outro usuário.
      if (accounts.length !== 2) {
        throw new HttpError("Conta inválida ou inativa", 400);
      }

      const source = accounts.find(
        (account) => account.id === input.sourceAccountId,
      );
      const destination = accounts.find(
        (account) => account.id === input.destinationAccountId,
      );

      if (!source || !destination) {
        throw new HttpError("Conta inválida ou inativa", 400);
      }

      if (source.currency !== destination.currency) {
        throw new HttpError(
          "Transferências entre moedas diferentes não são suportadas",
          400,
        );
      }

      const transfer = await tx.transfer.create({
        data: {
          userId,
          idempotencyKeyHash,
          requestHash,
        },
      });

      const [sourceLeg, destinationLeg] = await Promise.all([
        tx.transaction.create({
          data: {
            amount: input.amountCents,
            year: input.year,
            month: input.month,
            day: input.day,
            type: "EXPENSE",
            kind: "TRANSFER",
            description: input.description,
            status: input.status,
            accountId: source.id,
            categoryId: null,
            userId,
            transferId: transfer.id,
            transferRole: "SOURCE",
          },
        }),
        tx.transaction.create({
          data: {
            amount: input.amountCents,
            year: input.year,
            month: input.month,
            day: input.day,
            type: "INCOME",
            kind: "TRANSFER",
            description: input.description,
            status: input.status,
            accountId: destination.id,
            categoryId: null,
            userId,
            transferId: transfer.id,
            transferRole: "DESTINATION",
          },
        }),
      ]);

      return {
        id: transfer.id,
        currency: source.currency,
        sourceTransactionId: sourceLeg.id,
        destinationTransactionId: destinationLeg.id,
        status: input.status,
        replayed: false,
      };
    });
  } catch (error) {
    // Duas requisições concorrentes podem observar ausência antes de uma delas
    // confirmar. A constraint única escolhe a vencedora; a perdedora relembra
    // a operação já persistida em vez de criar um segundo par.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await findIdempotentTransfer(
        prisma,
        userId,
        idempotencyKeyHash,
      );
      if (existing) {
        assertReplayableIdempotentRequest(existing, requestHash);
        return toTransferResult(existing, true);
      }
    }

    throw error;
  }
}
