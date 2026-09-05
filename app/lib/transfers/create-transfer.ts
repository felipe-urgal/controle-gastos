import { prisma } from "@/app/lib/prisma";
import { HttpError } from "@/app/lib/http-error";
import type { CreateTransferInput } from "@/app/schemas/transfer.schema";

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

export async function createTransferForUser(
  userId: string,
  input: CreateTransferInput,
) {
  if (input.sourceAccountId === input.destinationAccountId) {
    throw new HttpError("As contas de origem e destino devem ser diferentes", 400);
  }

  assertValidCalendarDate(input.year, input.month, input.day);

  return prisma.$transaction(async (tx) => {
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

    const source = accounts.find((account) => account.id === input.sourceAccountId);
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

    const transfer = await tx.transfer.create({ data: { userId } });

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
    };
  });
}
